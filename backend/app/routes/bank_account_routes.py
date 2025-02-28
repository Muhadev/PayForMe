# app/routes/bank_account_routes.py
from flask import Blueprint, request, current_app, redirect, url_for
from app.services.stripe_service import StripeService
from app.utils.response import success_response, error_response
from app.utils.decorators import permission_required
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from app.models.user import User
from app import db

bank_account_bp = Blueprint('bank_account_bp', __name__)
stripe_service = StripeService()
logger = logging.getLogger(__name__)

@bank_account_bp.route('/connect-bank-account', methods=['POST'])
@jwt_required()
def create_connect_account():
    """Create a Stripe Connect account for the user."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user's information
        user = User.query.get(current_user_id)
        if not user:
            return error_response(message="User not found", status_code=404)
        
        # Check if user already has a Connect account
        if user.stripe_connect_id:
            return success_response(
                message="You already have a connected bank account",
                data={"account_connected": True}
            )
        
        # Create a Connect account and get the account setup URL
        result = stripe_service.create_connect_account(user)
        
        if 'error' in result:
            return error_response(message=result['error'], status_code=result.get('status_code', 400))
        
        return success_response(
            data=result,
            message="Bank account connection initiated"
        )
    except Exception as e:
        logger.error(f"Error in create_connect_account: {str(e)}")
        return error_response(message="An unexpected error occurred", status_code=500)

@bank_account_bp.route('/bank-account-status', methods=['GET'])
@jwt_required()
def get_bank_account_status():
    """Get the status of a user's connected bank account."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user's information
        user = User.query.get(current_user_id)
        if not user:
            return error_response(message="User not found", status_code=404)
        
        # Check if user has a Connect account
        if not user.stripe_connect_id:
            return success_response(
                data={
                    "account_connected": False,
                    "message": "No connected bank account found"
                }
            )
        
        # Get account details from Stripe
        result = stripe_service.get_connect_account_status(user.stripe_connect_id)
        
        if 'error' in result:
            return error_response(message=result['error'], status_code=result.get('status_code', 400))
        
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Error in get_bank_account_status: {str(e)}")
        return error_response(message="An unexpected error occurred", status_code=500)

@bank_account_bp.route('/connect-webhook', methods=['POST'])
def connect_webhook():
    """Handle Stripe Connect account webhooks."""
    logger.info("Received Stripe Connect webhook")
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    if not sig_header:
        logger.error("Missing Stripe-Signature header")
        return error_response(message="No signature header", status_code=400)
    
    success = stripe_service.handle_connect_webhook(payload, sig_header)
    
    if not success:
        return error_response(message="Invalid webhook", status_code=400)
    
    return success_response(message="Webhook processed successfully")

@bank_account_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def stripe_dashboard():
    """Redirect user to their Stripe Express dashboard."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user's information
        user = User.query.get(current_user_id)
        if not user:
            return error_response(message="User not found", status_code=404)
        
        # Check if user has a Connect account
        if not user.stripe_connect_id:
            return error_response(
                message="No connected bank account found. Please connect your account first.",
                status_code=404
            )
        
        # Create a dashboard link for the user
        stripe_service.stripe.api_key = stripe_service._stripe_key
        
        dashboard_link = stripe_service.stripe.Account.create_login_link(
            user.stripe_connect_id
        )
        
        # Redirect to the dashboard
        return redirect(dashboard_link.url)
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating dashboard link: {str(e)}")
        return error_response(message=str(e), status_code=400)
    except Exception as e:
        logger.error(f"Error creating dashboard link: {str(e)}")
        return error_response(message="An unexpected error occurred", status_code=500)
