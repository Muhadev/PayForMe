import stripe
from datetime import datetime
from app import db
from app.models import Payment, PaymentStatus
from app.config import StripeConfig
from app.utils.some_module import ConfigurationError, PaymentError  # Updated to import both errors
import logging
import asyncio
from typing import Optional, Dict, Union
from concurrent.futures import ThreadPoolExecutor

# Specific logger for this service
logger = logging.getLogger(__name__)

class StripePaymentService:
    STATUS_MAPPING = {
        'succeeded': PaymentStatus.COMPLETED,
        'processing': PaymentStatus.PROCESSING,
        'requires_payment_method': PaymentStatus.FAILED,
        'requires_confirmation': PaymentStatus.PENDING,
        'requires_action': PaymentStatus.PENDING,
        'canceled': PaymentStatus.CANCELLED
    }
    def __init__(self):
        if not StripeConfig.SECRET_KEY:
            raise ConfigurationError("Stripe secret key not configured")
        stripe.api_key = StripeConfig.SECRET_KEY
        self.webhook_secret = StripeConfig.WEBHOOK_SECRET
        self.executor = ThreadPoolExecutor()

    async def create_payment_intent(self, amount: float, currency: str, payment_method_id: str, metadata: dict = None) -> dict:
        """Create a Stripe PaymentIntent asynchronously."""
        return await asyncio.get_event_loop().run_in_executor(
            self.executor,
            lambda: stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency.lower(),
                payment_method=payment_method_id,
                confirmation_method='manual',
                confirm=True,
                metadata=metadata or {},
                return_url=StripeConfig.PAYMENT_RETURN_URL
            )
        )
    
    async def confirm_payment_intent(self, payment_intent_id: str) -> dict:
        """Confirm a PaymentIntent to finalize the payment asynchronously."""
        try:
            intent = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: stripe.PaymentIntent.confirm(payment_intent_id)
            )
            # Log and update the payment status in the database upon successful confirmation
            self._update_payment_status(payment_intent_id, PaymentStatus.COMPLETED)
            return intent
        except stripe.error.StripeError as e:
            raise self._handle_stripe_error(e, payment_intent_id)

    async def process_refund(self, payment_intent_id: str, amount: Optional[float] = None, reason: Optional[str] = None) -> dict:
        """Process a refund through Stripe asynchronously."""
        try:
            refund_params = {
                'payment_intent': payment_intent_id,
                'reason': reason or 'requested_by_customer'
            }
            if amount:
                refund_params['amount'] = int(amount * 100)  # Convert to cents

            refund = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: stripe.Refund.create(**refund_params)
            )
            self._update_payment_status(payment_intent_id, PaymentStatus.REFUNDED)  # Update DB status
            return refund
        except stripe.error.StripeError as e:
            raise self._handle_stripe_error(e, payment_intent_id)

    def verify_webhook(self, payload: str, sig_header: str) -> dict:
        """Verify Stripe webhook signature to confirm event authenticity"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except stripe.error.SignatureVerificationError:
            logger.warning("Invalid webhook signature")
            raise ValueError("Invalid webhook signature")

    def _handle_stripe_error(self, error: stripe.error.StripeError, payment_intent_id: Optional[str] = None) -> PaymentError:
        """Handle Stripe errors by mapping them to application-specific errors."""
        error_map = {
            stripe.error.CardError: ('Card was declined', 'card_declined'),
            stripe.error.RateLimitError: ('Too many requests', 'rate_limit'),
            stripe.error.InvalidRequestError: ('Invalid request', 'invalid_request'),
            stripe.error.AuthenticationError: ('Authentication failed', 'auth_failed'),
            stripe.error.APIConnectionError: ('Network error', 'api_connection'),
            stripe.error.StripeError: ('Payment processing failed', 'processing_failed')
        }
        
        error_class = type(error)
        message, code = error_map.get(error_class, ('Unknown error', 'unknown'))

        # Log detailed context from the Stripe error
        logger.error(
            f"Stripe error for PaymentIntent {payment_intent_id}: {message} - "
            f"Details: message={error.user_message or error.message}, param={error.param}, code={error.code}"
        )
        
        return PaymentError(
            message=f"{message}: {str(error)}",
            code=code,
            raw_error=error
        )

    def _update_payment_status(self, payment_intent_id: str, new_status: PaymentStatus) -> None:
        """Update the status of a payment in the database based on the payment intent ID."""
        payment = Payment.query.filter_by(transaction_id=payment_intent_id).first()
        if payment:
            if payment.status != new_status:
                try:
                    with db.session.begin():
                        payment.status = new_status
                        payment.updated_at = datetime.utcnow()
                        db.session.add(payment)
                    logger.info(f"Updated payment {payment.id} to status {new_status}")
                except Exception as db_error:
                    db.session.rollback()
                    logger.error(f"Failed to update payment status for {payment.id}: {str(db_error)}")
                    raise db_error
            else:
                logger.info(f"Payment {payment.id} already has status {new_status}, no update necessary.")

     def _map_stripe_status(self, stripe_status: str) -> PaymentStatus:
        """Map Stripe payment status to internal payment status"""
        return self.STATUS_MAPPING.get(stripe_status, PaymentStatus.FAILED)

class PaymentIntentResponse:
    """Define a structured response model if needed"""
    def __init__(self, id: str, amount: int, currency: str, status: str, metadata: dict):
        self.id = id
        self.amount = amount
        self.currency = currency
        self.status = status
        self.metadata = metadata