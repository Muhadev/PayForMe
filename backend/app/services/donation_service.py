# app/services/donation_service.py

from flask import current_app
import stripe
from app.models.donation import Donation
from app.models.user import User  # Add this import
from app.models.project import Project  # Add this import
from app.models.enums import DonationStatus
from app import db
from decimal import Decimal
from datetime import datetime
import logging
from app.services.email_service import send_templated_email
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class DonationService:
    def __init__(self):
        self.stripe = stripe
    
    @property
    def _stripe_key(self):
        return current_app.config['STRIPE_SECRET_KEY']
        
    def _init_stripe(self):
        self.stripe.api_key = self._stripe_key

    def create_donation(self, user_id, project_id, amount, reward_id=None, 
                       payment_method=None, currency='USD'):
        """Create a donation record in pending state."""
        self._init_stripe()
        try:
            amount = Decimal(str(amount)).quantize(Decimal('0.01'))
            
            donation = Donation(
                user_id=user_id,
                project_id=project_id,
                amount=amount,
                reward_id=reward_id,
                status=DonationStatus.PENDING,
                currency=currency,
                created_at=datetime.utcnow()
            )
            
            db.session.add(donation)
            try:
                db.session.commit()
            except Exception as e:
                logger.error(f"Error committing donation: {str(e)}")
                db.session.rollback()
                return None
                
            return donation
            
        except Exception as e:
            logger.error(f"Error creating donation: {str(e)}")
            return None

    def create_checkout_session(self, donation_id, success_url, cancel_url):
        """Create Stripe checkout session for the donation."""
        try:
            self._init_stripe()
            
            with Session(db.engine) as session:
                donation = session.query(Donation).get(donation_id)
                if not donation:
                    logger.error(f"Donation {donation_id} not found")
                    return None

                amount_cents = int(float(donation.amount) * 100)
                
                checkout_session = stripe.checkout.Session.create(
                    payment_method_types=['card'],
                    line_items=[{
                        'price_data': {
                            'currency': donation.currency.lower(),
                            'unit_amount': amount_cents,
                            'product_data': {
                                'name': f'Donation to Project #{donation.project_id}',
                                'description': f'Backing amount: {donation.amount} {donation.currency}'
                            },
                        },
                        'quantity': 1,
                    }],
                    mode='payment',
                    success_url=success_url,
                    cancel_url=cancel_url,
                    metadata={
                        'donation_id': donation_id,
                        'project_id': donation.project_id,
                        'user_id': donation.user_id
                    }
                )

                # Update donation with session ID
                donation.payment_session_id = checkout_session.id
                session.commit()

                return checkout_session

        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            return None

    def handle_webhook(self, payload, sig_header):
        """Handle Stripe webhooks with proper email notifications."""
        self._init_stripe()
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, current_app.config['STRIPE_WEBHOOK_SECRET']
            )

            # Use consistent dictionary access
            event_type = event['type']
            event_data = event['data']['object']

            if event_type == 'checkout.session.completed':
                return self._handle_successful_checkout(event_data)
            elif event_type == 'payment_intent.payment_failed':
                return self._handle_failed_payment(event_data)
            elif event_type == 'payment_intent.refunded':
                return self._handle_refund(event_data)
            
            return True  # Successfully processed unhandled event type
            
        except Exception as e:
            logger.error(f"Error handling webhook: {str(e)}")
            return False

    def _handle_successful_checkout(self, session):
        """Handle successful checkout completion."""
        try:
            donation_id = session['metadata']['donation_id']
            
            with Session(db.engine) as db_session:
                donation = db_session.query(Donation).get(donation_id)
                if not donation:
                    logger.error(f"Donation {donation_id} not found")
                    return False
                    
                # Update donation status
                donation.status = DonationStatus.COMPLETED
                donation.completed_at = datetime.utcnow()
                donation.payment_id = session['payment_intent']

                # Get related data for email
                user = db_session.query(User).get(donation.user_id)
                project = db_session.query(Project).get(donation.project_id)
                
                if not user or not project:
                    logger.error(f"User or Project not found for donation {donation_id}")
                    return False

                # Send success email
                try:
                    send_templated_email(
                        to_email=user.email,
                        email_type='donation_success',
                        donor_name=user.username,
                        project_title=project.title,
                        amount=float(donation.amount),
                        donation_id=donation.id
                    )
                except Exception as e:
                    logger.error(f"Failed to send success email: {str(e)}")
                    # Continue processing even if email fails
                
                db_session.commit()
                return True

        except Exception as e:
            logger.error(f"Error processing successful checkout: {str(e)}")
            return False

    def _process_successful_payment(self, session, donation_id):
        """Process successful payment and update donation status."""
        try:
            donation = Donation.query.get(donation_id)
            if donation:
                donation.status = DonationStatus.COMPLETED
                donation.payment_id = session.payment_intent
                donation.completed_at = datetime.utcnow()
                db.session.commit()
                return donation
        except Exception as e:
            logger.error(f"Error processing successful payment: {str(e)}")
        return None

    def _handle_failed_payment(self, payment_intent):
        """Handle failed payment webhook."""
        try:
            donation_id = payment_intent.metadata.get('donation_id')
            if donation_id:
                donation = Donation.query.get(donation_id)
                if donation:
                    donation.status = DonationStatus.FAILED
                    donation.failure_reason = payment_intent.last_payment_error.message if payment_intent.last_payment_error else 'Unknown error'
                    donation.failed_at = datetime.utcnow()
                    db.session.commit()
                    
                    # Send failure notification email
                    self._send_payment_failed_email(donation)
        except Exception as e:
            logger.error(f"Error handling failed payment: {str(e)}")

    def _handle_refund(self, refund):
        """Handle refund webhook."""
        try:
            donation_id = refund.metadata.get('donation_id')
            if donation_id:
                donation = Donation.query.get(donation_id)
                if donation:
                    donation.status = DonationStatus.REFUNDED
                    donation.refunded_at = datetime.utcnow()
                    donation.refund_amount = float(refund.amount) / 100
                    db.session.commit()
                    
                    # Send refund notification email
                    self._send_refund_notification_email(donation)
        except Exception as e:
            logger.error(f"Error handling refund: {str(e)}")

    def _send_donation_confirmation_email(self, donation):
        """Send confirmation email for successful donation."""
        try:
            with current_app.app_context():
                user = donation.user
                project = donation.project
                
                email_kwargs = {
                    'donor_name': user.username, 
                    'project_title': project.title,
                    'amount': float(donation.amount),
                    'currency': donation.currency,
                    'donation_id': donation.id,
                    'payment_id': donation.payment_id
                }

                if donation.reward:
                    email_kwargs['reward_title'] = donation.reward.title

                send_templated_email(
                    to_email=user.email,
                    email_type='donation_confirmation',
                    **email_kwargs
                )
                logger.info(f"Donation confirmation email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send donation confirmation email: {str(e)}")

    def _send_payment_failed_email(self, donation):
        """Send notification for failed payment."""
        try:
            with current_app.app_context():
                user = donation.user
                project = donation.project
                
                send_templated_email(
                    to_email=user.email,
                    email_type='donation_failed',
                    user_name=user.username,
                    project_title=project.title,
                    amount=float(donation.amount),
                    currency=donation.currency,
                    failure_reason=donation.failure_reason
                )
        except Exception as e:
            logger.error(f"Failed to send payment failed email: {str(e)}")

    def _send_refund_notification_email(self, donation):
        """Send notification for refunded donation."""
        try:
            with current_app.app_context():
                user = donation.user
                project = donation.project
                
                send_templated_email(
                    to_email=user.email,
                    email_type='donation_refund',
                    user_name=user.username,
                    project_title=project.title,
                    amount=float(donation.refund_amount),
                    currency=donation.currency
                )
        except Exception as e:
            logger.error(f"Failed to send refund notification email: {str(e)}")