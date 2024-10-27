from flask import Blueprint, request
from app.services.donation_service import DonationService
from app.utils.auth import login_required
from app.utils.response import success_response, error_response
from app.schemas.donation_schemas import DonationSchema  # Import your schema
import logging

donation_bp = Blueprint('donations', __name__)
donation_service = DonationService()
logger = logging.getLogger(__name__)

@donation_bp.route('/create', methods=['POST'])
@login_required
async def create_donation():
    """Create a new donation."""
    try:
        data = request.get_json()
        # Validate input data using the DonationSchema
        schema = DonationSchema()
        validated_data = schema.load(data)  # Validate and deserialize input
        
        donation = await donation_service.create_donation(
            user_id=request.user.id,
            project_id=validated_data['project_id'],
            amount=validated_data['amount'],
            reward_id=validated_data.get('reward_id'),
            payment_method=validated_data.get('payment_method', 'CREDIT_CARD'),
            currency=validated_data.get('currency', 'USD')
        )
        return success_response({"donation_id": donation.id})
    except ValidationError as ve:
        logger.error(f"Validation error: {str(ve)}")
        return error_response(str(ve), status_code=400)  # Bad request
    except Exception as e:
        logger.error(f"Error creating donation: {str(e)}")
        return error_response(str(e))
