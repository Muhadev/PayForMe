# app/routes/payout_routes.py
from flask import Blueprint, request, current_app
from app.services.payout_service import PayoutService
from app.utils.response import success_response, error_response
from app.utils.decorators import permission_required
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from app.utils.input_sanitizer import sanitize_input
from decimal import Decimal, InvalidOperation

payout_bp = Blueprint('payout_bp', __name__)
payout_service = PayoutService()
logger = logging.getLogger(__name__)

@payout_bp.route('/projects/<int:project_id>/payout/eligibility', methods=['GET'])
@jwt_required()
def check_payout_eligibility(project_id):
    """Check if a project is eligible for payout."""
    try:
        current_user_id = get_jwt_identity()
        result = payout_service.check_payout_eligibility(project_id, current_user_id)
        
        if not result['eligible']:
            return error_response(message=result['reason'], status_code=400)
        
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Error in check_payout_eligibility: {str(e)}")
        return error_response(message="An unexpected error occurred", status_code=500)

@payout_bp.route('/projects/<int:project_id>/payouts', methods=['POST'])
@jwt_required()
@permission_required('create_payout')
def request_payout(project_id):
    """Request a payout for a project."""
    try:
        current_user_id = get_jwt_identity()
        
        # Parse amount if provided
        data = sanitize_input(request.json or {})
        amount = None
        
        if 'amount' in data:
            try:
                amount = Decimal(str(data['amount']))
                if amount <= 0:
                    return error_response(message="Amount must be greater than zero", status_code=400)
            except (InvalidOperation, TypeError):
                return error_response(message="Invalid amount format", status_code=400)
        
        result = payout_service.request_payout(project_id, current_user_id, amount)
        
        if 'error' in result:
            return error_response(message=result['error'], status_code=result.get('status_code', 400))
        
        return success_response(data=result, message="Payout request submitted successfully")
    except Exception as e:
        logger.error(f"Error in request_payout: {str(e)}")
        return error_response(message="An unexpected error occurred", status_code=500)

@payout_bp.route('/', methods=['GET'])
@jwt_required()
def get_payout_history():
    """Get payout history for the current user."""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        project_id = request.args.get('project_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result = payout_service.get_payout_history(
            current_user_id, 
            project_id=project_id,
            page=page,
            per_page=per_page
        )
        
        if 'error' in result:
            return error_response(message=result['error'], status_code=result.get('status_code', 400))
        
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Error in get_payout_history: {str(e)}")
        return error_response(message="An unexpected error occurred", status_code=500)

@payout_bp.route('/payout-webhook', methods=['POST'])
def payout_webhook():
    """Handle Stripe webhooks for payout events."""
    logger.info("Received Stripe payout webhook")
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    if not sig_header:
        logger.error("Missing Stripe-Signature header")
        return error_response(message="No signature header", status_code=400)
    
    success = payout_service.handle_payout_webhook(payload, sig_header)
    
    if not success:
        return error_response(message="Invalid webhook", status_code=400)
    
    return success_response(message="Webhook processed successfully")