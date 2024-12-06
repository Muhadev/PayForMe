# app/services/donation_service.py

from flask import current_app, url_for
import stripe
from app.models.donation import Donation
from app.models.enums import DonationStatus
from config import Config
from app import db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DonationService:
    def __init__(self):
        self.stripe = stripe
    
    @property
    def _stripe_key(self):
        # Lazily get the stripe key only when needed
        return current_app.config['STRIPE_SECRET_KEY']
        
    def _init_stripe(self):
        # Initialize stripe with the key only when needed
        self.stripe.api_key = self._stripe_key

    def create_donation(self, user_id, project_id, amount, reward_id=None, 
                       payment_method=None, currency='USD'):
        """
        Create a donation record and initialize Stripe payment.
        """
        self._init_stripe()  # Initialize stripe before using it
        try:
            # Create donation record in pending state
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
            db.session.commit()
            
            return donation
            
        except Exception as e:
            logger.error(f"Error creating donation: {str(e)}")
            db.session.rollback()
            return None

    def create_checkout_session(self, donation_id, success_url, cancel_url):
        """
        Create Stripe Checkout session for the donation.
        """
        self._init_stripe()  # Initialize stripe before using it
        try:
            donation = Donation.query.get(donation_id)
            if not donation:
                return None

            # Convert amount to cents for Stripe
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
            db.session.commit()

            return checkout_session

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            return None

    def handle_webhook(self, payload, sig_header):
        """
        Handle Stripe webhooks for payment events.
        """
        self._init_stripe()  # Initialize stripe before using it
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, current_app.config['STRIPE_WEBHOOK_SECRET']
            )

            if event.type == 'checkout.session.completed':
                session = event.data.object
                donation_id = session.metadata.get('donation_id')
                
                if donation_id:
                    donation = Donation.query.get(donation_id)
                    if donation:
                        donation.status = DonationStatus.COMPLETED
                        donation.payment_id = session.payment_intent
                        donation.completed_at = datetime.utcnow()
                        db.session.commit()

            # New event types
            elif event.type == 'payment_intent.payment_failed':
                payment_intent = event.data.object
                donation_id = payment_intent.metadata.get('donation_id')
                
                if donation_id:
                    donation = Donation.query.get(donation_id)
                    if donation:
                        donation.status = DonationStatus.FAILED
                        donation.failure_reason = payment_intent.last_payment_error.message if payment_intent.last_payment_error else 'Unknown error'
                        donation.failed_at = datetime.utcnow()
                        db.session.commit()

            elif event.type == 'payment_intent.refunded':
                refund = event.data.object
                donation_id = refund.metadata.get('donation_id')
                
                if donation_id:
                    donation = Donation.query.get(donation_id)
                    if donation:
                        donation.status = DonationStatus.REFUNDED
                        donation.refunded_at = datetime.utcnow()
                        donation.refund_amount = float(refund.amount) / 100  # Convert cents to dollars
                        db.session.commit()

            return True

        except stripe.error.SignatureVerificationError:
            logger.error("Invalid signature in Stripe webhook")
            return False
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return False