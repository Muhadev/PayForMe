# app/routes/payment_routes.py
from flask import Blueprint, request
from app.services.donation_service import DonationService
from app.utils.response import success_response, error_response
from app.config import StripeConfig
import stripe
import logging

payment_bp = Blueprint('payments', __name__)
donation_service = DonationService()
logger = logging.getLogger(__name__)

@payment_bp.route('/<int:donation_id>/process', methods=['POST'])
@jwt_required()
async def process_donation_payment(donation_id):
    try:
        data = request.get_json()
        # Consider adding validation here
        result = await donation_service.process_donation_payment(
            donation_id=donation_id,
            payment_details=data
        )
        return success_response({
            "status": result.status.value,
            "transaction_id": result.transaction_id
        })
    except ValueError as ve:
        logger.error(f"ValueError: {str(ve)}")
        return error_response(str(ve), status_code=400)  # Bad request
    except Exception as e:
        logger.error(f"Error processing donation payment: {str(e)}")
        return error_response(str(e))

@payment_bp.route('/<int:donation_id>/refund', methods=['POST'])
async def refund_donation(donation_id):
    """Refund a donation."""
    try:
        result = await donation_service.refund_donation(donation_id)
        return success_response({"success": result})
    except Exception as e:
        logger.error(f"Error processing refund for donation {donation_id}: {str(e)}")
        return error_response(str(e))