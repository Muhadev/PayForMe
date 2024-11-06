from flask import Blueprint, request
from app.services.donation_service import DonationService
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.response import success_response, error_response
from app.schemas.donation_schemas import DonationSchema  # Import your schema
from marshmallow import ValidationError
import logging

donation_bp = Blueprint('donations', __name__)
donation_service = DonationService()
logger = logging.getLogger(__name__)

@donation_bp.route('/create', methods=['POST'])
@jwt_required()
async def create_donation():
    """Create a new donation."""
    try:
        data = request.get_json()
        # Validate input data using the DonationSchema
        schema = DonationSchema()
        schema.context = {"project_id": data.get("project_id"), "currency": data.get("currency", "USD")}  # Set context here
        validated_data = schema.load(data)  # Validate and deserialize input
        
        user_id = get_jwt_identity()

        donation = await donation_service.create_donation(
            user_id=user_id,
            project_id=validated_data['project_id'],
            amount=validated_data['amount'],
            currency=validated_data.get('currency', 'USD'),  # Default to 'USD' if not provided
            payment_method=validated_data.get('payment_method', 'CREDIT_CARD'),  # Default to 'CREDIT_CARD'
            payment_method_id=validated_data.get('payment_method_id'),  # Retrieve payment_method_id
            reward_id=validated_data.get('reward_id'),
            recurring=validated_data.get('recurring', False),
            anonymous=validated_data.get('anonymous', False),
            gift_aid=validated_data.get('gift_aid', False),
            # payment_method_id=validated_data.get('payment_method_id'),
            idempotency_key=validated_data.get('idempotency_key'),
            billing_details=validated_data.get('billing_details'),
            return_url=validated_data.get('return_url'),
            client_ip=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        if donation:
            return success_response({"donation_id": donation.id})
        else:
            return error_response("Failed to create donation", status_code=400)
    except ValidationError as ve:
        logger.error(f"Validation error: {str(ve)}")
        return error_response(str(ve), status_code=400)  # Bad request
    except Exception as e:
        logger.error(f"Error creating donation: {str(e)}")
        return error_response(str(e))
