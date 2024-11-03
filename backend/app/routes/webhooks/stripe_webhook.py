from flask import Blueprint, request
from app.utils.response import success_response, error_response
from app.services.stripe_payment_service import StripePaymentService
import logging

logger = logging.getLogger(__name__)

stripe_webhook_bp = Blueprint('stripe_webhook', __name__)

@stripe_webhook_bp.route('/', methods=['POST'])
async def stripe_webhook():
    """
    Handle Stripe webhooks by delegating to StripePaymentService.
    This keeps webhook handling logic centralized in the service layer.
    """
    try:
        payload = request.data
        sig_header = request.headers.get('Stripe-Signature')
        
        # Use the existing verify_webhook method from StripePaymentService
        stripe_service = StripePaymentService()
        event = await stripe_service.verify_webhook(payload, sig_header)
        
        return success_response({
            'status': 'success',
            'event_type': event.type
        })

    except ValueError as e:
        logger.error(f"Webhook validation failed: {str(e)}")
        return error_response(
            str(e),
            status_code=403
        )
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return error_response(
            f"Webhook processing failed: {str(e)}",
            status_code=500
        )