# app/routes/donation_routes.py
from flask import Blueprint, request
from app.services.donation_service import DonationService
from app.utils.auth import login_required
from app.utils.response import success_response, error_response
from app.services.payment_handlers import handle_payment_succeeded, handle_payment_failed

donation_bp = Blueprint('donations', __name__)
donation_service = DonationService()

@donation_bp.route('/donations', methods=['POST'])
@login_required
async def create_donation():
    try:
        data = request.get_json()
        donation = await donation_service.create_donation(
            user_id=request.user.id,
            project_id=data['project_id'],
            amount=data['amount'],
            reward_id=data.get('reward_id'),
            payment_method=data.get('payment_method', 'CREDIT_CARD'),
            currency=data.get('currency', 'USD')
        )
        return success_response({"donation_id": donation.id})
    except Exception as e:
        return error_response(str(e))

@donation_bp.route('/donations/<int:donation_id>/process', methods=['POST'])
@login_required
async def process_donation_payment(donation_id):
    try:
        data = request.get_json()
        result = await donation_service.process_donation_payment(
            donation_id=donation_id,
            payment_details=data
        )
        return success_response({
            "status": result.status.value,
            "transaction_id": result.transaction_id
        })
    except Exception as e:
        return error_response(str(e))

@donation_bp.route('/donations/<int:donation_id>/refund', methods=['POST'])
@login_required
async def refund_donation(donation_id):
    try:
        result = await donation_service.refund_donation(donation_id)
        return success_response({"success": result})
    except Exception as e:
        return error_response(str(e))

@donation_bp.route('/webhooks/stripe', methods=['POST'])
async def stripe_webhook():
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
        return error_response("Webhook signature verification failed.")
    except Exception as e:
        return error_response(str(e))
