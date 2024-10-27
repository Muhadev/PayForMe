# app/services/payment_handlers.py
from app import db
from app.models import Payment, PaymentStatus
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def handle_payment_succeeded(payment_intent):
    """Handle successful payment intent from Stripe."""
    payment_id = payment_intent.get('metadata', {}).get('payment_id')

    if not payment_id:
        logger.warning("Payment ID not found in metadata.")
        return

    payment = await Payment.query.filter_by(transaction_id=payment_id).first()

    if payment:
        try:
            payment.update_status(PaymentStatus.COMPLETED)
            payment.updated_at = datetime.utcnow()  # Update the timestamp
            await db.session.commit()  # Commit the changes to the database
            logger.info(f"Payment succeeded for transaction ID: {payment_id}")
        except Exception as e:
            logger.error(f"Error updating payment status for ID {payment_id}: {str(e)}")
            await db.session.rollback()  # Rollback if there's an error
    else:
        logger.warning(f'Payment not found for transaction ID: {payment_id}')


async def handle_payment_failed(payment_intent):
    """Handle failed payment intent from Stripe."""
    payment_id = payment_intent.get('metadata', {}).get('payment_id')

    if not payment_id:
        logger.warning("Payment ID not found in metadata.")
        return

    payment = await Payment.query.filter_by(transaction_id=payment_id).first()

    if payment:
        try:
            payment.update_status(PaymentStatus.FAILED, error_message="Payment failed.")
            payment.updated_at = datetime.utcnow()  # Update timestamp
            await db.session.commit()  # Commit the changes to the database
            logger.info(f"Payment failed for transaction ID: {payment_id}")
        except Exception as e:
            logger.error(f"Error updating payment status for ID {payment_id}: {str(e)}")
            await db.session.rollback()  # Rollback if there's an error
    else:
        logger.warning(f'Payment not found for transaction ID: {payment_id}')
