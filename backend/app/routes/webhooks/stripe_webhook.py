from flask import Blueprint, request
from app.services.payment_handlers import handle_payment_succeeded, handle_payment_failed
from app.utils.response import success_response, error_response
from app.config import StripeConfig
import stripe
import logging

logger = logging.getLogger(__name__)

stripe_webhook_bp = Blueprint('stripe_webhook', __name__)

@stripe_webhook_bp.route('/', methods=['POST'])
async def stripe_webhook():
    """Handle Stripe webhooks."""
    try:
        payload = request.data
        sig_header = request.headers.get('Stripe-Signature')
        event = stripe.Webhook.construct_event(
            payload, sig_header, StripeConfig.WEBHOOK_SECRET
        )

        if event['type'] == 'payment_intent.succeeded':
            await handle_payment_succeeded(event['data']['object'])
        elif event['type'] == 'payment_intent.payment_failed':
            await handle_payment_failed(event['data']['object'])

        return success_response({'status': 'success'})
    except stripe.error.SignatureVerificationError:
        logger.error("Webhook signature verification failed.")
        return error_response("Webhook signature verification failed.", status_code=403)  # Forbidden
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return error_response(str(e))
