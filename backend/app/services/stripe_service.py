# app/services/stripe_service.py
import stripe
from flask import current_app, url_for
from app.models.user import User
from app import db
import logging
import json

logger = logging.getLogger(__name__)

class StripeService:
    def __init__(self):
        self.stripe = stripe
    
    @property
    def _stripe_key(self):
        return current_app.config['STRIPE_SECRET_KEY']
        
    def _init_stripe(self):
        self.stripe.api_key = self._stripe_key
    
    def create_connect_account(self, user):
        """Create a Stripe Connect account for a user."""
        self._init_stripe()
        
        try:
            # Create a Connect account
            account = self.stripe.Account.create(
                type="express",
                country=user.country_code or "US",
                email=user.email,
                capabilities={
                    "transfers": {"requested": True},
                },
                business_type="individual",
                metadata={
                    "user_id": user.id
                }
            )
            
            # Update user with the account ID
            user.stripe_connect_id = account.id
            db.session.commit()
            
            # Create an account link for onboarding
            account_link = self.stripe.AccountLink.create(
                account=account.id,
                refresh_url=f"{current_app.config['FRONTEND_URL']}/connect/refresh",
                return_url=f"{current_app.config['FRONTEND_URL']}/connect/callback",
                type="account_onboarding",
            )
            
            return {
                "account_id": account.id,
                "url": account_link.url
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating Connect account: {str(e)}")
            return {'error': str(e), 'status_code': 400}
        except Exception as e:
            logger.error(f"Error creating Connect account: {str(e)}")
            return {'error': 'Error creating bank account connection', 'status_code': 500}
    
    def get_connect_account_status(self, account_id):
        """Get the status of a Stripe Connect account."""
        self._init_stripe()
        
        try:
            account = self.stripe.Account.retrieve(account_id)
            
            # Check if the account is fully onboarded
            is_complete = (
                account.details_submitted 
                and account.payouts_enabled
                and account.capabilities.get('transfers') == 'active'
            )
            
            return {
                "account_connected": True,
                "account_id": account_id,
                "details_submitted": account.details_submitted,
                "payouts_enabled": account.payouts_enabled,
                "charges_enabled": account.charges_enabled,
                "requirements": account.requirements,
                "is_complete": is_complete
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving Connect account: {str(e)}")
            return {'error': str(e), 'status_code': 400}
        except Exception as e:
            logger.error(f"Error retrieving Connect account: {str(e)}")
            return {'error': 'Error retrieving bank account status', 'status_code': 500}
    
    def handle_connect_webhook(self, payload, sig_header):
        """Handle Stripe Connect account webhooks."""
        self._init_stripe()
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, current_app.config['STRIPE_CONNECT_WEBHOOK_SECRET']
            )
            
            event_type = event['type']
            event_data = event['data']['object']
            
            # Handle account updated event
            if event_type == 'account.updated':
                return self._handle_account_updated(event_data)
            
            return True  # Successfully processed unhandled event type
            
        except Exception as e:
            logger.error(f"Error handling Connect webhook: {str(e)}")
            return False
    
    def _handle_account_updated(self, account):
        """Handle account.updated webhook event."""
        try:
            account_id = account.get('id')
            user_id = account.get('metadata', {}).get('user_id')
            
            if not account_id or not user_id:
                logger.error("Missing account_id or user_id in webhook")
                return False
            
            # Update user's account status if needed
            user = User.query.filter_by(id=user_id).first()
            
            if not user:
                logger.error(f"User {user_id} not found")
                return False
            
            # Ensure the stripe_connect_id is set
            if not user.stripe_connect_id:
                user.stripe_connect_id = account_id
                db.session.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing account.updated webhook: {str(e)}")
            return False

    def create_dashboard_link(self, account_id):
        """Create a link to the Stripe Express dashboard for a Connect account."""
        self._init_stripe()
        
        try:
            login_link = self.stripe.Account.create_login_link(account_id)
            return login_link.url
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating dashboard link: {str(e)}")
            return None