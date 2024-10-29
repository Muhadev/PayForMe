from app import db
from app.models import Payment, PaymentStatus
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import logging
from decimal import Decimal
from celery import shared_task
from typing import Optional

logger = logging.getLogger(__name__)

# Define error codes for structured error handling
class PaymentErrorCode:
    MISSING_PAYMENT_ID = "MISSING_PAYMENT_ID"
    PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND"
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
    DUPLICATE_WEBHOOK = "DUPLICATE_WEBHOOK"
    GENERAL_ERROR = "GENERAL_ERROR"

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
async def handle_payment_succeeded(self, payment_intent: dict) -> None:
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
        
    async with AsyncSession(db.engine) as session:
        try:
            # Check for idempotency to avoid duplicate webhook processing
            payment = await session.execute(Payment.query.filter_by(transaction_id=payment_id))
            payment = payment.scalar_one_or_none()
            
            if not payment:
                logger.warning(f"{PaymentErrorCode.PAYMENT_NOT_FOUND}: Payment not found for transaction ID: {payment_id}")
                return
            
            if payment.status == PaymentStatus.COMPLETED:
                logger.info(f"{PaymentErrorCode.DUPLICATE_WEBHOOK}: Payment already processed for transaction ID: {payment_id}")
                return
            
            # Verify both amount and currency match expected payment
            stripe_amount = Decimal(payment_intent['amount']) / 100  # Convert from cents
            stripe_currency = payment_intent['currency']
            if not payment.verify_amount(stripe_amount) or payment.currency != stripe_currency:
                logger.error(f"{PaymentErrorCode.AMOUNT_MISMATCH}: Mismatch for payment {payment_id}. Expected: {payment.amount} {payment.currency}, Got: {stripe_amount} {stripe_currency}")
                payment.update_status(PaymentStatus.FAILED, "Amount or currency verification failed")
                await session.commit()
                return
                
            # Update payment details
            payment.update_status(PaymentStatus.COMPLETED)
            payment.payment_metadata = {
                'stripe_id': payment_intent['id'],
                'payment_method_details': payment_intent.get('payment_method_details'),
                'receipt_url': payment_intent.get('receipt_url'),
                'received_currency': stripe_currency,
                'received_amount': stripe_amount
            }
            payment.calculate_fees()
            
            await db.session.commit()
            logger.info(f"Payment succeeded for transaction ID: {payment_id}")
            
        xcept IntegrityError:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Integrity error on transaction ID {payment_id}")
        except Exception as e:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Error processing successful payment for ID {payment_id}: {str(e)}")

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
async def handle_payment_failed(self, payment_intent: dict) -> None:
    """
    Handle failed payment intent webhook from Stripe.
    Updates payment status and records error details.
    
    Args:
        payment_intent (dict): The payment intent object from Stripe webhook
    """
    payment_id = payment_intent.get('metadata', {}).get('payment_id')
    
    if not payment_id:
        logger.warning(f"{PaymentErrorCode.MISSING_PAYMENT_ID}: Payment ID not found in metadata")
        return
        
    async with AsyncSession(db.engine) as session:
        try:
            payment = await session.execute(Payment.query.filter_by(transaction_id=payment_id))
            payment = payment.scalar_one_or_none()
            
            if not payment:
                logger.warning(f"{PaymentErrorCode.PAYMENT_NOT_FOUND}: Payment not found for transaction ID: {payment_id}")
                return
            
            error = payment_intent.get('last_payment_error', {})
            error_message = error.get('message', 'Payment failed')
            
            payment.update_status(PaymentStatus.FAILED, error_message)
            payment.payment_metadata = {
                'stripe_id': payment_intent['id'],
                'error_code': error.get('code'),
                'decline_code': error.get('decline_code')
            }
            
            await session.commit()
            logger.info(f"Payment failed for transaction ID: {payment_id}: {error_message}")
        
    except IntegrityError:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Integrity error on transaction ID {payment_id}")
    except Exception as e:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Error processing failed payment for ID {payment_id}: {str(e)}")

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
async def handle_refund_processed(self, charge: dict) -> None:
    """
    Handle refund webhook from Stripe.
    Updates payment status and records refund details.
    
    Args:
        charge (dict): The charge object from Stripe webhook
    """
    payment_id = charge.get('metadata', {}).get('payment_id')
    
    if not payment_id:
        logger.warning(f"{PaymentErrorCode.MISSING_PAYMENT_ID}: Payment ID not found in metadata")
        return
        
    async with AsyncSession(db.engine) as session:
        try:
            payment = await session.execute(Payment.query.filter_by(transaction_id=payment_id))
            payment = payment.scalar_one_or_none()
            
            if not payment:
                logger.warning(f"{PaymentErrorCode.PAYMENT_NOT_FOUND}: Payment not found for transaction ID: {payment_id}")
                return
            
            if payment.status == PaymentStatus.REFUNDED:
                logger.info(f"{PaymentErrorCode.DUPLICATE_WEBHOOK}: Refund already processed for transaction ID: {payment_id}")
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
            
            await session.commit()
            logger.info(f"Refund processed for transaction ID: {payment_id}")
        
        except IntegrityError:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Integrity error on transaction ID {payment_id}")
        except Exception as e:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Error processing refund for ID {payment_id}: {str(e)}")

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
async def handle_dispute_created(self, dispute: dict) -> None:
    """
    Handle dispute webhook from Stripe.
    Updates payment status and records dispute details.
    
    Args:
        dispute (dict): The dispute object from Stripe webhook
    """
    payment_id = dispute.get('charge', {}).get('metadata', {}).get('payment_id')
    
    if not payment_id:
        logger.warning(f"{PaymentErrorCode.MISSING_PAYMENT_ID}: Payment ID not found in metadata")
        return
        
    async with AsyncSession(db.engine) as session:
        try:
            payment = await session.execute(Payment.query.filter_by(transaction_id=payment_id))
            payment = payment.scalar_one_or_none()
            
            if not payment:
                logger.warning(f"{PaymentErrorCode.PAYMENT_NOT_FOUND}: Payment not found for transaction ID: {payment_id}")
                return
            
            if payment.status == PaymentStatus.DISPUTED:
                logger.info(f"{PaymentErrorCode.DUPLICATE_WEBHOOK}: Dispute already processed for transaction ID: {payment_id}")
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
            
            await session.commit()
            logger.info(f"Dispute created for transaction ID: {payment_id}")
        
        except IntegrityError:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Integrity error on transaction ID {payment_id}")
        except Exception as e:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Error processing dispute for ID {payment_id}: {str(e)}")