from datetime import datetime
from app import db
from app.models import Payment, PaymentStatus, PaymentMethod
from app.services.stripe_payment_service import StripePaymentService
from app.schemas.donation_schemas import DonationSchema
from app.schemas.payment_schemas import PaymentDetailsSchema, RefundSchema
from app.config import StripeConfig
from app.utils.redis_client import get_redis_client
import logging
from marshmallow import ValidationError
from typing import Optional, Union

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.stripe_service = StripePaymentService()
        self.donation_schema = DonationSchema()
        self.payment_details_schema = PaymentDetailsSchema()
        self.refund_schema = RefundSchema()
        self.redis_client = get_redis_client()

    async def validate_payment_request(self, amount: float, currency: str) -> None:
        """Validate payment amount and currency, with detailed logging."""
        try:
            if currency not in StripeConfig.SUPPORTED_CURRENCIES:
                logger.error(f"Unsupported currency: {currency}")
                raise ValueError(f"Unsupported currency: {currency}")
            
            min_amount = StripeConfig.MINIMUM_AMOUNT.get(currency, 0.5)
            if amount < min_amount:
                logger.error(f"Amount {amount} is below minimum for {currency}: {min_amount}")
                raise ValueError(f"Amount below minimum for {currency}: {min_amount}")

            if not isinstance(amount, (float, int)) or amount <= 0:
                logger.error("Invalid amount format")
                raise ValueError("Invalid amount format")

        except ValueError as e:
            logger.error(f"Validation failed: {str(e)}")
            raise

    async def create_payment(self, user_id: int, donation_id: int, amount: float, currency: str, payment_method: str, ip_address: Optional[str] = None) -> Payment:
        """Create a new payment with validation and rate limiting."""
        try:
            # Validate donation data
            validated_data = self.donation_schema.load({
                "user_id": user_id, 
                "donation_id": donation_id, 
                "amount": amount, 
                "currency": currency, 
                "payment_method": payment_method
            })

            await self.validate_payment_request(validated_data['amount'], validated_data['currency'])
            
            await self._apply_rate_limit(user_id)  # New helper for rate-limiting

            # Payment model creation
            payment = Payment(
                user_id=user_id,
                donation_id=donation_id,
                amount=amount,
                currency=currency,
                status=PaymentStatus.PENDING,
                method=PaymentMethod[payment_method.upper()],
                ip_address=ip_address,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            payment.calculate_fees()
            with db.session.begin():
                db.session.add(payment)
                logger.info(f"Payment created: {payment.id} for user {user_id}")
            
            return payment

        except ValidationError as ve:
            logger.error(f"Validation failed: {ve.messages}")
            raise ValueError(f"Validation failed: {ve.messages}")
        except Exception as e:
            logger.error(f"Payment creation failed: {str(e)}", exc_info=True)
            raise

    async def _apply_rate_limit(self, user_id: int):
        """Helper function for rate-limiting payment attempts."""
        key = f"rate_limit:payment_attempts:{user_id}"
        attempts = await self.redis_client.get(key)
        if attempts and int(attempts) >= StripeConfig.RATE_LIMIT_ATTEMPTS:
            raise ValueError("Too many payment attempts. Please try again later.")
        await self.redis_client.incr(key)
        await self.redis_client.expire(key, StripeConfig.RATE_LIMIT_WINDOW)

    async def process_payment(self, payment_id: int, payment_details: dict) -> Payment:
        """Process payment through Stripe"""
        try:
            validated_data = self.payment_details_schema.load(payment_details)
            payment = self._get_payment_or_raise(payment_id)

            intent = await self.stripe_service.create_payment_intent(
                amount=payment.amount,
                currency=payment.currency,
                payment_method_id=validated_data['payment_method_id'],
                metadata={
                    'payment_id': payment_id,
                    'donation_id': payment.donation_id,
                    'user_id': payment.user_id
                }
            )
            
            # Use consistent status update logic for each status change
            new_status = self.stripe_service._map_stripe_status(intent.status)
            if payment.status != new_status:
                with db.session.begin():
                    payment.status = new_status
                    payment.transaction_id = intent.id
                    payment.updated_at = datetime.utcnow()
                    logger.info(f"Payment status updated to {new_status} for Payment ID {payment_id}")
            return payment

        except Exception as e:
            db.session.rollback()  # Single rollback within the error handling block
            logger.error(f"Payment processing failed for Payment ID {payment_id}: {str(e)}", exc_info=True)
            raise e

    async def process_refund(self, payment_id: int, refund_data: Optional[dict] = None) -> bool:
        """Process refund through Stripe"""
        try:
            validated_data = self.refund_schema.load(refund_data) if refund_data else {}
            payment = self._get_payment_or_raise(payment_id)

            if not payment.can_be_refunded():
                raise ValueError("Payment cannot be refunded")

            refund = await self.stripe_service.process_refund(
                payment_intent_id=payment.transaction_id,
                amount=validated_data.get('refund_amount'),
                reason=validated_data.get('reason')
            )

            async with db.session.begin():
                payment.status = PaymentStatus.REFUNDED
                payment.updated_at = datetime.utcnow()
                payment.payment_metadata.update({
                    'refund_id': refund.id,
                    'refund_status': refund.status
                })
                logger.info(f"Refund successful for Payment ID {payment_id} - Refund ID: {refund.id}")
            
            return True

        except Exception as e:
            await db.session.rollback()
            logger.error(f"Payment processing failed for Payment ID {payment_id}: {str(e)}", exc_info=True)
            raise e

    async def _get_payment_or_raise(self, payment_id: int) -> Payment:
        payment = await Payment.query.get(payment_id)
        if not payment:
            raise ValueError(f"Payment with ID {payment_id} not found.")
        return payment