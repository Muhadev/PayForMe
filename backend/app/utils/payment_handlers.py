from app import db
from app.models import Payment, PaymentStatus
from datetime import datetime
import logging
from decimal import Decimal
from celery import shared_task
from typing import Optional

logger = logging.getLogger(__name__)

async def handle_payment_succeeded(payment_intent: dict) -> None:
    """
    Handle successful payment intent webhook from Stripe.
    Updates payment status and records transaction details.
    
    Args:
        payment_intent (dict): The payment intent object from Stripe webhook
    """
    payment_id = payment_intent.get('metadata', {}).get('payment_id')
    
    if not payment_id:
        logger.warning("Payment ID not found in metadata")
        return
        
    try:
        payment = await Payment.query.filter_by(transaction_id=payment_id).first()
        if not payment:
            logger.warning(f'Payment not found for transaction ID: {payment_id}')
            return
            
        # Verify amount matches expected payment
        stripe_amount = Decimal(payment_intent['amount']) / 100  # Convert from cents
        if not payment.verify_amount(stripe_amount):
            logger.error(f"Amount mismatch for payment {payment_id}. Expected: {payment.amount}, Got: {stripe_amount}")
            payment.update_status(PaymentStatus.FAILED, "Amount verification failed")
            await db.session.commit()
            return
            
        # Update payment details
        payment.update_status(PaymentStatus.COMPLETED)
        payment.payment_metadata = {
            'stripe_id': payment_intent['id'],
            'payment_method_details': payment_intent.get('payment_method_details'),
            'receipt_url': payment_intent.get('receipt_url')
        }
        payment.calculate_fees()
        
        await db.session.commit()
        logger.info(f"Payment succeeded for transaction ID: {payment_id}")
        
    except Exception as e:
        logger.error(f"Error processing successful payment for ID {payment_id}: {str(e)}")
        await db.session.rollback()
        
async def handle_payment_failed(payment_intent: dict) -> None:
    """
    Handle failed payment intent webhook from Stripe.
    Updates payment status and records error details.
    
    Args:
        payment_intent (dict): The payment intent object from Stripe webhook
    """
    payment_id = payment_intent.get('metadata', {}).get('payment_id')
    
    if not payment_id:
        logger.warning("Payment ID not found in metadata")
        return
        
    try:
        payment = await Payment.query.filter_by(transaction_id=payment_id).first()
        if not payment:
            logger.warning(f'Payment not found for transaction ID: {payment_id}')
            return
            
        error = payment_intent.get('last_payment_error', {})
        error_message = error.get('message', 'Payment failed')
        
        payment.update_status(PaymentStatus.FAILED, error_message)
        payment.payment_metadata = {
            'stripe_id': payment_intent['id'],
            'error_code': error.get('code'),
            'decline_code': error.get('decline_code')
        }
        
        await db.session.commit()
        logger.info(f"Payment failed for transaction ID: {payment_id}: {error_message}")
        
    except Exception as e:
        logger.error(f"Error processing failed payment for ID {payment_id}: {str(e)}")
        await db.session.rollback()

async def handle_refund_processed(charge: dict) -> None:
    """
    Handle refund webhook from Stripe.
    Updates payment status and records refund details.
    
    Args:
        charge (dict): The charge object from Stripe webhook
    """
    payment_id = charge.get('metadata', {}).get('payment_id')
    
    if not payment_id:
        logger.warning("Payment ID not found in metadata")
        return
        
    try:
        payment = await Payment.query.filter_by(transaction_id=payment_id).first()
        if not payment:
            logger.warning(f'Payment not found for transaction ID: {payment_id}')
            return
            
        refund = charge.get('refunds', {}).get('data', [{}])[0]
        
        payment.update_status(PaymentStatus.REFUNDED)
        payment.refund_reason = refund.get('reason')
        payment.payment_metadata = {
            **payment.payment_metadata,
            'refund_id': refund.get('id'),
            'refund_amount': refund.get('amount'),
            'refund_date': datetime.fromtimestamp(refund.get('created', 0)).isoformat()
        }
        
        await db.session.commit()
        logger.info(f"Refund processed for transaction ID: {payment_id}")
        
    except Exception as e:
        logger.error(f"Error processing refund for ID {payment_id}: {str(e)}")
        await db.session.rollback()

async def handle_dispute_created(dispute: dict) -> None:
    """
    Handle dispute webhook from Stripe.
    Updates payment status and records dispute details.
    
    Args:
        dispute (dict): The dispute object from Stripe webhook
    """
    payment_id = dispute.get('charge', {}).get('metadata', {}).get('payment_id')
    
    if not payment_id:
        logger.warning("Payment ID not found in metadata")
        return
        
    try:
        payment = await Payment.query.filter_by(transaction_id=payment_id).first()
        if not payment:
            logger.warning(f'Payment not found for transaction ID: {payment_id}')
            return
            
        payment.update_status(PaymentStatus.DISPUTED)
        payment.payment_metadata = {
            **payment.payment_metadata,
            'dispute_id': dispute.get('id'),
            'dispute_reason': dispute.get('reason'),
            'dispute_status': dispute.get('status'),
            'dispute_amount': dispute.get('amount'),
            'dispute_date': datetime.fromtimestamp(dispute.get('created', 0)).isoformat()
        }
        
        await db.session.commit()
        logger.info(f"Dispute created for transaction ID: {payment_id}")
        
    except Exception as e:
        logger.error(f"Error processing dispute for ID {payment_id}: {str(e)}")
        await db.session.rollback()