# app/services/payout_service.py
import stripe
from flask import current_app
from app.models.payout import Payout, PayoutStatus
from app.models.project import Project
from app.models.user import User
from app.models.donation import Donation
from app.models.enums import ProjectStatus, DonationStatus
from app import db
from decimal import Decimal
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.services.email_service import send_templated_email

logger = logging.getLogger(__name__)

class PayoutService:
    def __init__(self):
        self.stripe = stripe
    
    @property
    def _stripe_key(self):
        return current_app.config['STRIPE_SECRET_KEY']
        
    def _init_stripe(self):
        self.stripe.api_key = self._stripe_key
    
    def calculate_available_funds(self, project_id):
        """Calculate available funds for a project after platform fees."""
        try:
            with Session(db.engine) as session:
                # Get total successful donations
                total_donations = session.query(func.sum(Donation.amount)) \
                    .filter(Donation.project_id == project_id) \
                    .filter(Donation.status == DonationStatus.COMPLETED) \
                    .scalar() or Decimal('0')
                
                # Get total already paid out
                total_paid_out = session.query(func.sum(Payout.amount)) \
                    .filter(Payout.project_id == project_id) \
                    .filter(Payout.status.in_([PayoutStatus.COMPLETED, PayoutStatus.PROCESSING])) \
                    .scalar() or Decimal('0')
                
                # Calculate platform fee (e.g., 5%)
                platform_fee_percentage = Decimal(current_app.config.get('PLATFORM_FEE_PERCENTAGE', '5'))
                platform_fee = (total_donations * platform_fee_percentage) / Decimal('100')
                
                # Calculate available funds
                available_funds = total_donations - total_paid_out - platform_fee
                available_funds = max(Decimal('0'), available_funds)
                
                return {
                    'total_donations': float(total_donations),
                    'total_paid_out': float(total_paid_out),
                    'platform_fee': float(platform_fee),
                    'available_funds': float(available_funds)
                }
                
        except Exception as e:
            logger.error(f"Error calculating available funds: {str(e)}")
            return {'error': 'Error calculating available funds', 'status_code': 500}
    
    def check_payout_eligibility(self, project_id, user_id):
        """Check if a project is eligible for payout."""
        try:
            with Session(db.engine) as session:
                project = session.query(Project).get(project_id)
                
                if not project:
                    return {'eligible': False, 'reason': 'Project not found'}
                
                # Check if user is project creator
                if project.creator_id != user_id:
                    return {'eligible': False, 'reason': 'Only project creator can request payouts'}
                
                # Check project status (could be based on your business rules)
                if project.status not in [ProjectStatus.FUNDED, ProjectStatus.ACTIVE]:
                    return {'eligible': False, 'reason': f'Project must be active or funded'}
                
                # Check if there are funds available
                funds_info = self.calculate_available_funds(project_id)
                
                if 'error' in funds_info:
                    return {'eligible': False, 'reason': funds_info['error']}
                
                if funds_info['available_funds'] <= 0:
                    return {'eligible': False, 'reason': 'No funds available for payout'}
                
                return {
                    'eligible': True, 
                    'available_amount': funds_info['available_funds'],
                    'funds_info': funds_info
                }
                
        except Exception as e:
            logger.error(f"Error checking payout eligibility: {str(e)}")
            return {'eligible': False, 'reason': 'Error checking eligibility'}
    
    def request_payout(self, project_id, user_id, amount=None):
        """Request a payout for a project."""
        try:
            eligibility = self.check_payout_eligibility(project_id, user_id)
            
            if not eligibility['eligible']:
                return {'error': eligibility['reason'], 'status_code': 400}
            
            available_amount = Decimal(str(eligibility['available_amount']))
            
            # If amount is not specified, use all available funds
            if amount is None:
                amount = available_amount
            else:
                amount = Decimal(str(amount))
                
                if amount > available_amount:
                    return {'error': f'Requested amount exceeds available funds', 'status_code': 400}
            
            with Session(db.engine) as session:
                project = session.query(Project).get(project_id)
                user = session.query(User).get(user_id)
                
                # Check if user has connected Stripe account
                if not user.stripe_connect_id:
                    return {'error': 'Please connect a bank account first', 'status_code': 400}
                
                # Calculate platform fee
                platform_fee_percentage = Decimal(current_app.config.get('PLATFORM_FEE_PERCENTAGE', '5'))
                fee_amount = (amount * platform_fee_percentage) / Decimal('100')
                
                # Create payout record
                payout = Payout(
                    project_id=project_id,
                    user_id=user_id,
                    amount=amount,
                    fee_amount=fee_amount,
                    currency=project.currency or 'USD',
                    status=PayoutStatus.PENDING,
                    created_at=datetime.utcnow(),
                    bank_account_id=user.stripe_connect_id
                )
                
                session.add(payout)
                session.commit()
                
                # Process the payout via Stripe
                process_result = self._process_stripe_payout(payout.id)
                
                if 'error' in process_result:
                    return process_result
                
                return {
                    'payout_id': payout.id,
                    'amount': float(amount),
                    'fee_amount': float(fee_amount),
                    'status': payout.status.value,
                    'created_at': payout.created_at.isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error requesting payout: {str(e)}")
            return {'error': 'Error processing payout request', 'status_code': 500}
    
    def _process_stripe_payout(self, payout_id):
        """Process a payout through Stripe Connect."""
        self._init_stripe()
        
        try:
            with Session(db.engine) as session:
                payout = session.query(Payout).get(payout_id)
                
                if not payout:
                    return {'error': 'Payout not found', 'status_code': 404}
                
                # Get user's Stripe Connect account
                user = session.query(User).get(payout.user_id)
                
                if not user.stripe_connect_id:
                    payout.status = PayoutStatus.FAILED
                    payout.failure_reason = 'No connected Stripe account'
                    session.commit()
                    return {'error': 'Stripe account not connected', 'status_code': 400}
                
                # Convert amount to cents for Stripe
                amount_cents = int(float(payout.amount) * 100)
                
                # Create a transfer to the connected account
                transfer = stripe.Transfer.create(
                    amount=amount_cents,
                    currency=payout.currency.lower(),
                    destination=user.stripe_connect_id,
                    transfer_group=f'project_{payout.project_id}',
                    metadata={
                        'payout_id': payout.id,
                        'project_id': payout.project_id,
                        'platform_fee': float(payout.fee_amount)
                    }
                )
                
                # Update payout record
                payout.stripe_payout_id = transfer.id
                payout.status = PayoutStatus.PROCESSING
                session.commit()
                
                # Send notification email
                try:
                    project = session.query(Project).get(payout.project_id)
                    send_templated_email(
                        to_email=user.email,
                        email_type='payout_initiated',
                        user_name=user.username,
                        project_title=project.title,
                        amount=float(payout.amount),
                        currency=payout.currency
                    )
                except Exception as e:
                    logger.error(f"Failed to send payout email: {str(e)}")
                
                return {
                    'payout_id': payout.id,
                    'transfer_id': transfer.id,
                    'status': payout.status.value
                }
                
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing payout: {str(e)}")
            
            try:
                with Session(db.engine) as session:
                    payout = session.query(Payout).get(payout_id)
                    payout.status = PayoutStatus.FAILED
                    payout.failure_reason = str(e)
                    session.commit()
            except Exception as inner_e:
                logger.error(f"Error updating payout status: {str(inner_e)}")
            
            return {'error': 'Payment processor error', 'status_code': 500}
            
        except Exception as e:
            logger.error(f"Error processing payout: {str(e)}")
            return {'error': 'Error processing payout', 'status_code': 500}
            
    def get_payout_history(self, user_id, project_id=None, page=1, per_page=20):
        """Get payout history for a user, optionally filtered by project."""
        try:
            with Session(db.engine) as session:
                query = session.query(Payout).filter(Payout.user_id == user_id)
                
                if project_id:
                    query = query.filter(Payout.project_id == project_id)
                
                # Count total records
                total = query.count()
                
                # Apply pagination
                offset = (page - 1) * per_page
                payouts = query.order_by(Payout.created_at.desc()).offset(offset).limit(per_page).all()
                
                result = []
                for payout in payouts:
                    result.append({
                        'id': payout.id,
                        'project_id': payout.project_id,
                        'amount': float(payout.amount),
                        'fee_amount': float(payout.fee_amount),
                        'net_amount': float(payout.amount - payout.fee_amount),
                        'currency': payout.currency,
                        'status': payout.status.value,
                        'created_at': payout.created_at.isoformat(),
                        'processed_at': payout.processed_at.isoformat() if payout.processed_at else None,
                        'failure_reason': payout.failure_reason
                    })
                
                # Calculate pagination metadata
                total_pages = (total + per_page - 1) // per_page
                
                return {
                    'payouts': result,
                    'meta': {
                        'page': page,
                        'per_page': per_page,
                        'total': total,
                        'pages': total_pages
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting payout history: {str(e)}")
            return {'error': 'Error retrieving payout history', 'status_code': 500}
    
    def handle_payout_webhook(self, payload, sig_header):
        """Handle Stripe webhooks for payout events."""
        self._init_stripe()
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, current_app.config['STRIPE_WEBHOOK_SECRET']
            )
            
            event_type = event['type']
            event_data = event['data']['object']
            
            if event_type == 'transfer.paid':
                return self._handle_transfer_paid(event_data)
            elif event_type == 'transfer.failed':
                return self._handle_transfer_failed(event_data)
            
            return True  # Successfully processed unhandled event type
            
        except Exception as e:
            logger.error(f"Error handling payout webhook: {str(e)}")
            return False
            
    def _handle_transfer_paid(self, transfer):
        """Handle successful transfer webhook."""
        try:
            payout_id = transfer.get('metadata', {}).get('payout_id')
            
            if not payout_id:
                logger.error("No payout_id in transfer metadata")
                return False
            
            with Session(db.engine) as session:
                payout = session.query(Payout).get(payout_id)
                
                if not payout:
                    logger.error(f"Payout {payout_id} not found")
                    return False
                
                payout.status = PayoutStatus.COMPLETED
                payout.processed_at = datetime.utcnow()
                
                # Save changes
                session.commit()
                
                # Send success email
                try:
                    user = session.query(User).get(payout.user_id)
                    project = session.query(Project).get(payout.project_id)
                    
                    send_templated_email(
                        to_email=user.email,
                        email_type='payout_completed',
                        user_name=user.username,
                        project_title=project.title,
                        amount=float(payout.amount),
                        currency=payout.currency,
                        payout_id=payout.id
                    )
                except Exception as e:
                    logger.error(f"Failed to send payout success email: {str(e)}")
                
                return True
                
        except Exception as e:
            logger.error(f"Error processing transfer.paid webhook: {str(e)}")
            return False
            
    def _handle_transfer_failed(self, transfer):
        """Handle failed transfer webhook."""
        try:
            payout_id = transfer.get('metadata', {}).get('payout_id')
            
            if not payout_id:
                logger.error("No payout_id in transfer metadata")
                return False
            
            with Session(db.engine) as session:
                payout = session.query(Payout).get(payout_id)
                
                if not payout:
                    logger.error(f"Payout {payout_id} not found")
                    return False
                
                payout.status = PayoutStatus.FAILED
                payout.failure_reason = transfer.get('failure_message', 'Unknown error')
                
                # Save changes
                session.commit()
                
                # Send failure email
                try:
                    user = session.query(User).get(payout.user_id)
                    project = session.query(Project).get(payout.project_id)
                    
                    send_templated_email(
                        to_email=user.email,
                        email_type='payout_failed',
                        user_name=user.username,
                        project_title=project.title,
                        amount=float(payout.amount),
                        currency=payout.currency,
                        failure_reason=payout.failure_reason
                    )
                except Exception as e:
                    logger.error(f"Failed to send payout failure email: {str(e)}")
                
                return True
                
        except Exception as e:
            logger.error(f"Error processing transfer.failed webhook: {str(e)}")
            return False