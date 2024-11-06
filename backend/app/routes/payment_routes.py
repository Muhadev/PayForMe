# app/routes/payment_routes.py
from flask import Blueprint, request
from app.services.donation_service import DonationService
from app.utils.response import success_response, error_response
from app.config.stripe_config import StripeConfig
from flask_jwt_extended import jwt_required, get_jwt_identity
import stripe
import logging

payment_bp = Blueprint('payments', __name__)
donation_service = DonationService()
logger = logging.getLogger(__name__)


@payment_bp.route('/success')
def payment_success():
    """
    Display success page after successful payment.
    This should be implemented in your frontend routes.
    """
    donation_id = request.args.get('donation_id')
    amount = request.args.get('amount')
    currency = request.args.get('currency')
    
    return success_response({
        "message": "Payment successful",
        "donation_id": donation_id,
        "amount": amount,
        "currency": currency
    })

@payment_bp.route('/error')
def payment_error():
    """
    Display error page for failed payments.
    This should be implemented in your frontend routes.
    """
    error = request.args.get('error', 'Unknown error')
    return error_response(error, status_code=400)

@payment_bp.route('/processing')
def payment_processing():
    """
    Display processing page for pending payments.
    This should be implemented in your frontend routes.
    """
    donation_id = request.args.get('donation_id')
    return success_response({
        "message": "Payment is being processed",
        "donation_id": donation_id
    })


@payment_bp.route('/complete', methods=['GET'])
async def payment_complete():
    """
    Handle the return URL after payment completion.
    Returns JSON response instead of redirecting.
    """
    try:
        # Get payment intent ID from query parameters
        payment_intent_id = request.args.get('payment_intent')
        if not payment_intent_id:
            logger.error("No payment_intent provided in return URL")
            return error_response(
                message="Invalid payment session",
                status_code=400
            )

        # Retrieve payment status
        payment = await payment_service.get_payment_by_transaction_id(payment_intent_id)
        if not payment:
            logger.error(f"Payment not found for intent {payment_intent_id}")
            return error_response(
                message="Payment not found",
                status_code=404
            )

        # Return appropriate response based on payment status
        if payment.status == PaymentStatus.COMPLETED:
            return success_response({
                "status": "success",
                "message": "Payment successful",
                "data": {
                    "donation_id": payment.donation_id,
                    "amount": float(payment.amount),
                    "currency": payment.currency,
                    "transaction_id": payment.transaction_id,
                    "status": payment.status.value,
                    "created_at": payment.created_at.isoformat()
                }
            })
        
        elif payment.status == PaymentStatus.PENDING:
            return success_response({
                "status": "processing",
                "message": "Payment is being processed",
                "data": {
                    "donation_id": payment.donation_id,
                    "transaction_id": payment.transaction_id
                }
            }, status_code=202)  # 202 Accepted
            
        else:
            return error_response(
                message=f"Payment failed with status: {payment.status.value}",
                status_code=400,
                data={
                    "donation_id": payment.donation_id,
                    "transaction_id": payment.transaction_id,
                    "status": payment.status.value
                }
            )

    except Exception as e:
        logger.error(f"Error in payment completion: {str(e)}")
        return error_response(
            message="An unexpected error occurred",
            status_code=500
        )

@payment_bp.route('/<int:donation_id>/process', methods=['POST'])
@jwt_required()
async def process_donation_payment(donation_id):
    """
    Process a donation payment and create payment intent
    """
    try:
        data = request.get_json()
        payment_intent = await donation_service.process_donation_payment(
            donation_id=donation_id,
            payment_details=data
        )
        
        # Return the client secret and redirect URL
        return success_response({
            "client_secret": payment_intent.client_secret,
            "status": payment_intent.status,
            "next_action": payment_intent.next_action,
            "return_url": StripeConfig.PAYMENT_RETURN_URL + f"?payment_intent={payment_intent.id}"
        })

    except ValueError as ve:
        logger.error(f"ValueError: {str(ve)}")
        return error_response(str(ve), status_code=400)
    except Exception as e:
        logger.error(f"Error processing donation payment: {str(e)}")
        return error_response(str(e), status_code=500)

@payment_bp.route('/<int:donation_id>/status', methods=['GET'])
async def check_payment_status(donation_id):
    """
    Check the current status of a payment
    """
    try:
        payment = await payment_service.get_payment_by_donation_id(donation_id)
        if not payment:
            return error_response("Payment not found", status_code=404)

        return success_response({
            "status": payment.status.value,
            "donation_id": payment.donation_id,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "transaction_id": payment.transaction_id,
            "created_at": payment.created_at.isoformat(),
            "updated_at": payment.updated_at.isoformat()
        })

    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        return error_response(str(e), status_code=500)

@payment_bp.route('/<int:donation_id>/refund', methods=['POST'])
@jwt_required()
async def refund_donation(donation_id):
    """Refund a donation with detailed response"""
    try:
        result = await donation_service.refund_donation(donation_id)
        
        return success_response({
            "status": "success",
            "message": "Refund processed successfully",
            "data": {
                "donation_id": donation_id,
                "refund_id": result.get('refund_id'),
                "amount": result.get('amount'),
                "status": result.get('status')
            }
        })
    except ValueError as ve:
        return error_response(str(ve), status_code=400)
    except Exception as e:
        logger.error(f"Error processing refund for donation {donation_id}: {str(e)}")
        return error_response(str(e), status_code=500)