# app/services/payment_service.py
from app import db
from app.models import Payment, PaymentStatus
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def handle_payment_succeeded(payment_intent):
    """Handle successful payment intent from Stripe."""
    payment_id = payment_intent['metadata']['payment_id']
    payment = await Payment.query.filter_by(transaction_id=payment_id).first()

    if payment:
        payment.update_status(PaymentStatus.COMPLETED)
        payment.updated_at = datetime.utcnow()  # Ensure to set the updated time
        await db.session.commit()  # Commit the changes to the database
    else:
        logger.warning(f'Payment not found for transaction ID: {payment_id}')

async def handle_payment_failed(payment_intent):
    """Handle failed payment intent from Stripe."""
    payment_id = payment_intent['metadata']['payment_id']
    payment = await Payment.query.filter_by(transaction_id=payment_id).first()

    if payment:
        payment.update_status(PaymentStatus.FAILED, error_message="Payment failed.")
        payment.updated_at = datetime.utcnow()  # Update timestamp
        await db.session.commit()  # Commit the changes to the database
    else:
        logger.warning(f'Payment not found for transaction ID: {payment_id}')
