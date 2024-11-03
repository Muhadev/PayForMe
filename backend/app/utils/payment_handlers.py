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
        logger.warning(f"{PaymentErrorCode.MISSING_PAYMENT_ID}: Payment ID not found in metadata")
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
            
        except IntegrityError:
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

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
async def handle_payment_processing(self, payment_intent: dict) -> None:
    """
    Handle processing payment intent webhook from Stripe.
    Updates payment status to processing.
    
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
            
            if payment.status == PaymentStatus.PROCESSING:
                logger.info(f"{PaymentErrorCode.DUPLICATE_WEBHOOK}: Payment already processing for transaction ID: {payment_id}")
                return
            
            payment.update_status(PaymentStatus.PROCESSING)
            payment.payment_metadata = {
                'stripe_id': payment_intent['id'],
                'processing_started_at': datetime.utcnow().isoformat()
            }
            
            await session.commit()
            logger.info(f"Payment processing started for transaction ID: {payment_id}")
            
        except IntegrityError:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Integrity error on transaction ID {payment_id}")
        except Exception as e:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Error updating processing status for ID {payment_id}: {str(e)}")

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
async def handle_payment_canceled(self, payment_intent: dict) -> None:
    """
    Handle canceled payment intent webhook from Stripe.
    Updates payment status to canceled and records cancellation details.
    
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
            
            if payment.status == PaymentStatus.CANCELED:
                logger.info(f"{PaymentErrorCode.DUPLICATE_WEBHOOK}: Payment already canceled for transaction ID: {payment_id}")
                return
            
            cancellation_reason = payment_intent.get('cancellation_reason', 'Unknown')
            
            payment.update_status(PaymentStatus.CANCELED)
            payment.payment_metadata = {
                'stripe_id': payment_intent['id'],
                'cancellation_reason': cancellation_reason,
                'canceled_at': datetime.utcnow().isoformat()
            }
            
            await session.commit()
            logger.info(f"Payment canceled for transaction ID: {payment_id} - Reason: {cancellation_reason}")
            
        except IntegrityError:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Integrity error on transaction ID {payment_id}")
        except Exception as e:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Error processing cancellation for ID {payment_id}: {str(e)}")

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
async def handle_charge_succeeded(self, charge: dict) -> None:
    """
    Handle successful charge webhook from Stripe.
    Updates payment status and records charge details.
    
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
            
            if payment.status == PaymentStatus.COMPLETED:
                logger.info(f"{PaymentErrorCode.DUPLICATE_WEBHOOK}: Charge already processed for transaction ID: {payment_id}")
                return
            
            # Verify amount and currency
            charge_amount = Decimal(charge['amount']) / 100  # Convert from cents
            charge_currency = charge['currency']
            if not payment.verify_amount(charge_amount) or payment.currency != charge_currency:
                logger.error(f"{PaymentErrorCode.AMOUNT_MISMATCH}: Mismatch for payment {payment_id}. Expected: {payment.amount} {payment.currency}, Got: {charge_amount} {charge_currency}")
                payment.update_status(PaymentStatus.FAILED, "Amount or currency verification failed")
                await session.commit()
                return
            
            payment.update_status(PaymentStatus.COMPLETED)
            payment.payment_metadata = {
                'charge_id': charge['id'],
                'payment_method_details': charge.get('payment_method_details'),
                'receipt_url': charge.get('receipt_url'),
                'received_currency': charge_currency,
                'received_amount': charge_amount,
                'charge_created': datetime.fromtimestamp(charge.get('created', 0)).isoformat()
            }
            payment.calculate_fees()
            
            await session.commit()
            logger.info(f"Charge succeeded for transaction ID: {payment_id}")
            
        except IntegrityError:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Integrity error on transaction ID {payment_id}")
        except Exception as e:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Error processing charge for ID {payment_id}: {str(e)}")

@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 5})
async def handle_charge_failed(self, charge: dict) -> None:
    """
    Handle failed charge webhook from Stripe.
    Updates payment status and records failure details.
    
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
            
            failure_code = charge.get('failure_code')
            failure_message = charge.get('failure_message', 'Charge failed')
            
            payment.update_status(PaymentStatus.FAILED, failure_message)
            payment.payment_metadata = {
                'charge_id': charge['id'],
                'failure_code': failure_code,
                'failure_message': failure_message,
                'failed_at': datetime.fromtimestamp(charge.get('created', 0)).isoformat()
            }
            
            await session.commit()
            logger.info(f"Charge failed for transaction ID: {payment_id}: {failure_message}")
            
        except IntegrityError:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Integrity error on transaction ID {payment_id}")
        except Exception as e:
            await session.rollback()
            logger.error(f"{PaymentErrorCode.GENERAL_ERROR}: Error processing failed charge for ID {payment_id}: {str(e)}")