import stripe
from datetime import datetime
from app import db
from app.models import Payment, PaymentStatus
from app.config import StripeConfig
from app.utils.some_module import ConfigurationError, PaymentError  # Updated to import both errors
import logging
import asyncio
import time
from typing import Optional, Dict, Union
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import select
from app.utils.redis_client import get_redis_client
# Import the payment handlers
from app.utils.payment_handlers import (
    handle_payment_succeeded,
    handle_payment_failed,
    handle_refund_processed,
    handle_dispute_created
)

# Specific logger for this service
logger = logging.getLogger(__name__)

class PaymentIntentResponse:
    """Structured response model for payment intents."""
    def __init__(
        self,
        id: str,
        amount: Decimal,
        currency: str,
        status: PaymentStatus,
        metadata: Dict,
        client_secret: Optional[str] = None,
        requires_action: bool = False,
        next_action: Optional[Dict] = None
    ):
        self.id = id
        self.amount = amount
        self.currency = currency
        self.status = status
        self.metadata = metadata
        self.client_secret = client_secret
        self.requires_action = requires_action
        self.next_action = next_action

    @classmethod
    def from_stripe_intent(cls, intent: Dict) -> 'PaymentIntentResponse':
        """Create response model from Stripe PaymentIntent."""
        return cls(
            id=intent.id,
            amount=Decimal(intent.amount) / 100,
            currency=intent.currency,
            status=StripePaymentService.STATUS_MAPPING.get(
                intent.status,
                PaymentStatus.FAILED
            ),
            metadata=intent.metadata,
            client_secret=intent.client_secret,
            requires_action=intent.status == 'requires_action',
            next_action=intent.next_action
        )

class StripePaymentService:
    STATUS_MAPPING = {
        'succeeded': PaymentStatus.COMPLETED,
        'processing': PaymentStatus.PROCESSING,
        'requires_payment_method': PaymentStatus.FAILED,
        'requires_confirmation': PaymentStatus.PENDING,
        'requires_action': PaymentStatus.PENDING,
        'canceled': PaymentStatus.CANCELLED,
        'requires_capture': PaymentStatus.PENDING,
    }
    def __init__(self):
        """Validate required configuration settings."""
        required_configs = {
            'SECRET_KEY': StripeConfig.SECRET_KEY,
            'PAYMENT_RETURN_URL': StripeConfig.PAYMENT_RETURN_URL,
            'WEBHOOK_SECRET': StripeConfig.WEBHOOK_SECRET
        }
        
        missing = [key for key, value in required_configs.items() if not value]
        if missing:
            raise ConfigurationError(
                f"Missing required configuration(s): {', '.join(missing)}"
            )
        self.executor = ThreadPoolExecutor(max_workers=5)
        stripe.api_key = StripeConfig.SECRET_KEY

    def _validate_metadata(self, metadata: Optional[Dict]) -> Dict:
        """
        Validate and sanitize metadata before sending to Stripe.
        
        Args:
            metadata: Dictionary of metadata to validate
            
        Returns:
            Dict: Sanitized metadata dictionary
            
        Raises:
            ValueError: If metadata validation fails
        """
        if not metadata:
            return {}

        sanitized = {}
        for key, value in metadata.items():
            # Convert key to string and ensure it's not too long
            key_str = str(key)[:40]  # Stripe's key length limit
            
            # Convert value to string and limit length
            value_str = str(value)
            if len(value_str) > StripeConfig.MAX_METADATA_LENGTH:
                logger.warning(
                    f"Metadata value too long for key {key_str}, truncating"
                )
                value_str = value_str[:StripeConfig.MAX_METADATA_LENGTH]
            
            sanitized[key_str] = value_str

        return sanitized

    async def create_payment_intent(
        self, 
        amount: Decimal,
        currency: str,
        payment_method_id: str,
        metadata: Optional[Dict] = None,
        capture_method: str = 'automatic',  # Added for crowdfunding flexibility
        statement_descriptor: Optional[str] = None,
        setup_future_usage: Optional[str] = 'off_session',
        idempotency_key: Optional[str] = None
    ) -> Dict:
        """
        Create a Stripe PaymentIntent with crowdfunding-specific configurations.
        
        Args:
            amount: Decimal amount in the currency's main unit (e.g., dollars)
            currency: Three-letter ISO currency code
            payment_method_id: Stripe payment method ID
            metadata: Additional information about the payment
            capture_method: 'automatic' or 'manual' for delayed capture
            statement_descriptor: Custom descriptor for bank statements
        """
        try:
            currency = currency.lower()
            if currency not in StripeConfig.SUPPORTED_CURRENCIES:
                raise ValueError(f"Unsupported currency: {currency}")

            amount_cents = int(amount * 100)
            if amount_cents <= 0:
                raise ValueError("Amount must be positive")


            # Validate and sanitize metadata
            sanitized_metadata = self._validate_metadata(metadata)

            intent_params = {
                'amount': amount_cents,
                'currency': currency.lower(),
                'payment_method': payment_method_id,
                'confirmation_method': 'manual',
                'confirm': True,
                'metadata': metadata or {},
                'return_url': StripeConfig.PAYMENT_RETURN_URL,
                'capture_method': capture_method,
                'setup_future_usage': setup_future_usage,
            }
            if statement_descriptor:
                intent_params['statement_descriptor'] = statement_descriptor[:22]  # Stripe limit

            # Use idempotency key if provided
            stripe_kwargs = {
                'idempotency_key': idempotency_key
            } if idempotency_key else {}

            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: stripe.PaymentIntent.create(
                    **intent_params,
                    **stripe_kwargs
                )
            )
            
            # Create payment record in database
            await self._create_payment_record(result)
            
            return result

        except (ValueError, stripe.error.StripeError) as e:
            logger.error(f"Failed to create payment intent: {str(e)}", exc_info=True)
            raise self._handle_stripe_error(e)
    
    async def capture_payment_intent(self, payment_intent_id: str, amount: Optional[Decimal] = None) -> Dict:
        """
        Capture a previously authorized payment intent.
        Useful for capturing funds once crowdfunding goal is met.
        """
        try:
            capture_params = {}
            if amount is not None:
                capture_params['amount_to_capture'] = int(amount * 100)

            result = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: stripe.PaymentIntent.capture(payment_intent_id, **capture_params)
            )
            
            await self._update_payment_status(payment_intent_id, self._map_stripe_status(result.status))
            return result

        except stripe.error.StripeError as e:
            logger.error(f"Failed to capture payment intent {payment_intent_id}: {str(e)}")
            raise self._handle_stripe_error(e, payment_intent_id)
        
    async def process_refund(
        self,
        payment_intent_id: str,
        amount: Optional[Decimal] = None,
        reason: str = 'requested_by_customer'
    ) -> Dict:
        """
        Process a refund with improved validation and error handling.
        """
        if amount is not None and amount <= 0:
            raise ValueError("Refund amount must be positive")

        try:
            refund_params = {
                'payment_intent': payment_intent_id,
                'reason': reason
            }
            
            if amount:
                refund_params['amount'] = int(amount * 100)

            refund = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: stripe.Refund.create(**refund_params)
            )
            
            await self._update_payment_status(payment_intent_id, PaymentStatus.REFUNDED)
            
            # Add webhook handling for refund.succeeded event
            return refund

        except stripe.error.StripeError as e:
            logger.error(f"Refund failed for payment {payment_intent_id}: {str(e)}")
            raise self._handle_stripe_error(e, payment_intent_id)

    def verify_webhook(self, payload: str, sig_header: str) -> Dict:
        """
        Verify and process Stripe webhooks with additional security checks.
        """
        if not sig_header:
            raise ValueError("Missing Stripe signature header")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            
            event_handlers = {
                'payment_intent.succeeded': self.handle_payment_succeeded,
                'payment_intent.payment_failed': self.handle_payment_failed,
                'charge.refunded': self.handle_refund_processed,
                'charge.dispute.created': self.handle_dispute_created
            }

            handler = event_handlers.get(event.type)
            if handler:
                await handler(event.data.object)
            else:
                logger.info(f"Unhandled event type: {event.type}")

            return event

        except stripe.error.SignatureVerificationError:
            logger.warning("Invalid webhook signature", exc_info=True)
            raise ValueError("Invalid webhook signature")
        except Exception as e:
            logger.error(f"Webhook verification failed: {str(e)}", exc_info=True)
            raise

    async def _create_payment_record(self, payment_intent: Dict) -> None:
        """Create a new payment record in the database."""
        try:
            payment = Payment(
                transaction_id=payment_intent['id'],
                amount=Decimal(payment_intent['amount']) / 100,
                currency=payment_intent['currency'],
                status=self._map_stripe_status(payment_intent['status']),
                metadata=payment_intent['metadata']
            )
            db.session.add(payment)
            await db.session.commit()
        except Exception as e:
            await db.session.rollback()
            logger.error(f"Failed to create payment record: {str(e)}")
            raise

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

    async def _update_payment_status(
        self, 
        payment_intent_id: str, 
        new_status: PaymentStatus,
        max_retries: int = 3,
        rate_limit_key: str = "payment_status_update"
    ) -> None:
        """
        Update payment status with rate limiting and retry mechanism.
        
        Args:
            payment_intent_id: Stripe payment intent ID
            new_status: New payment status to set
            max_retries: Maximum number of retry attempts
            rate_limit_key: Key for rate limiting specific operations
        """
        retry_count = 0
        redis_client = get_redis_client()
        
        while retry_count < max_retries:
            try:
                # Apply rate limiting
                now = time.time()
                limit_key = f"rate_limit:payment_update:{payment_intent_id}"
                reset_key = f"rl_reset:{limit_key}"
                count_key = f"rl_count:{limit_key}"
                
                # Rate limit: 5 updates per 10 seconds per payment
                RATE_LIMIT = 5
                RATE_PERIOD = 10
                
                try:
                    last_reset = redis_client.get(reset_key)
                    count = redis_client.get(count_key)

                    if not last_reset or now - float(last_reset) > RATE_PERIOD:
                        redis_client.set(reset_key, now, ex=RATE_PERIOD)
                        redis_client.set(count_key, 1, ex=RATE_PERIOD)
                        count = 1
                    else:
                        count = int(count or 0) + 1
                        if count > RATE_LIMIT:
                            retry_after = round(RATE_PERIOD - (now - float(last_reset)), 2)
                            logger.warning(
                                f"Rate limit exceeded for payment {payment_intent_id}. "
                                f"Retry after {retry_after}s"
                            )
                            await asyncio.sleep(retry_after)
                            retry_count += 1
                            continue
                        redis_client.set(count_key, count, ex=RATE_PERIOD)

                except RedisError as e:
                    logger.error(f"Redis error in rate limiting: {str(e)}")
                    # Continue without rate limiting if Redis is unavailable
                    pass

                # Acquire a distributed lock for this payment
                lock_key = f"payment_lock:{payment_intent_id}"
                lock_acquired = False
                
                try:
                    # Try to acquire a lock with 5-second timeout
                    lock_acquired = redis_client.set(
                        lock_key, 
                        'locked', 
                        ex=5, 
                        nx=True
                    )
                    
                    if not lock_acquired:
                        logger.warning(f"Lock acquisition failed for payment {payment_intent_id}")
                        await asyncio.sleep(0.5 * (retry_count + 1))
                        retry_count += 1
                        continue

                    # Get payment with SELECT FOR UPDATE
                    async with db.session.begin():
                        payment = await db.session.execute(
                            select(Payment)
                            .filter_by(transaction_id=payment_intent_id)
                            .with_for_update(skip_locked=True)
                        ).scalar_one_or_none()

                        if not payment:
                            logger.error(f"Payment not found for intent {payment_intent_id}")
                            return

                        if payment.status != new_status:
                            payment.status = new_status
                            payment.updated_at = datetime.utcnow()
                            await db.session.commit()
                            logger.info(
                                f"Updated payment {payment.id} to status {new_status}"
                            )
                        else:
                            logger.info(
                                f"Payment {payment.id} already has status {new_status}"
                            )
                        return  # Success, exit the retry loop

                except SQLAlchemyError as e:
                    await db.session.rollback()
                    logger.error(f"Database error updating payment status: {str(e)}")
                    retry_count += 1
                    
                except Exception as e:
                    logger.error(f"Unexpected error updating payment status: {str(e)}")
                    retry_count += 1

                finally:
                    if lock_acquired:
                        try:
                            redis_client.delete(lock_key)
                        except RedisError:
                            logger.error(f"Failed to release lock for payment {payment_intent_id}")

            except Exception as e:
                logger.error(f"Error in update attempt {retry_count + 1}: {str(e)}")
                retry_count += 1
                
            # Exponential backoff between retries
            if retry_count < max_retries:
                await asyncio.sleep(0.5 * (2 ** retry_count))
        
        if retry_count >= max_retries:
            logger.error(
                f"Failed to update payment status after {max_retries} attempts"
            )
            raise PaymentError(
                message="Failed to update payment status",
                code="update_failed"
            )
     def _map_stripe_status(self, stripe_status: str) -> PaymentStatus:
        """Map Stripe payment status to internal payment status"""
        return self.STATUS_MAPPING.get(stripe_status, PaymentStatus.FAILED)