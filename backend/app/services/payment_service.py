from datetime import datetime
from app import db
from app.models import Payment, PaymentStatus, PaymentMethod
from app.services.stripe_payment_service import StripePaymentService
from app.schemas.donation_schemas import DonationSchema
from app.schemas.payment_schemas import PaymentSchema, RefundSchema
from app.config.stripe_config import StripeConfig
from app.utils.redis_client import get_redis_client
import logging
from marshmallow import ValidationError
from typing import Optional, Union, Dict, Any
from app.utils.rate_limit import rate_limit
from sqlalchemy.exc import SQLAlchemyError
from app.utils.payment_helpers import (
    get_payment_metadata,
    validate_payment_request,
    apply_rate_limit,
    check_idempotency
)

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.stripe_service = StripePaymentService()
        self.donation_schema = DonationSchema()
        self.payment_details_schema = PaymentSchema()
        self.refund_schema = RefundSchema()
        self._redis_client = None  # Lazy-initialize later

    @property
    def redis_client(self):
        if self._redis_client is None:
            # Only initialize redis client here, ensuring app context is available
            self._redis_client = get_redis_client()
        return self._redis_client

    async def get_payment_by_transaction_id(self, transaction_id: str) -> Optional[Payment]:
        """Retrieve payment by Stripe transaction ID."""
        return await Payment.query.filter_by(transaction_id=transaction_id).first()

    @rate_limit(limit=3, per=300)
    async def create_payment(self, user_id: int, donation_id: int, amount: float,
                             currency: str, metadata: Optional[Dict[str, str]] = None,
                             return_url: Optional[str] = None, client_ip: Optional[str] = None,
                             user_agent: Optional[str] = None) -> Optional[Payment]:
        """Create a new payment with validation and rate limiting."""
        async with db.session.begin():
            try:
                # Check if payment with the same idempotency_key already exists
                if idempotency_key := kwargs.get('idempotency_key'):
                    existing_payment = await check_idempotency(
                        self.redis_client, idempotency_key, {'user_id': user_id, 'donation_id': donation_id}
                    )
                    if existing_payment:
                        logger.info(f"Payment with idempotency key {idempotency_key} already exists")
                        return existing_payment

                # Generate metadata if not provided
                metadata = metadata or get_payment_metadata(idempotency_key=idempotency_key)

                # Proceed with creating a new payment
                payment_data = {
                    'amount': amount,
                    'currency': currency,
                    'metadata': metadata
                }

                validated_data = await validate_payment_request(payment_data, self.payment_details_schema)

                # Apply rate limit
                await apply_rate_limit(self.redis_client, user_id)

                # Create payment
                payment = Payment(
                    user_id=user_id,
                    donation_id=donation_id,
                    **validated_data,
                    status=PaymentStatus.PENDING,
                    metadata=metadata or {},
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                payment.calculate_fees()
                db.session.add(payment)
                db.session.commit()
                logger.info(f"Payment created: {payment.id} for user {user_id} with project_id {project_id}")
                return payment

            except ValidationError as ve:
                logger.error(f"Validation failed: {ve.messages}")
                raise ValueError(f"Validation failed: {ve.messages}")
            except Exception as e:
                logger.error(f"Payment creation failed: {str(e)}", exc_info=True)
                raise

    async def process_payment(self, payment_id: int, payment_details: dict) -> Payment:
        """Process payment through Stripe"""
        try:
            validated_data = await validate_payment_request(payment_details, self.payment_details_schema)
            payment = self._get_payment_or_raise(payment_id)

            # Generate payment metadata
            metadata = await get_payment_metadata(
                billing_details=validated_data.get("billing_details"),
                payment_method=validated_data["payment_method"],
                idempotency_key=validated_data.get("idempotency_key")
            )

            # Create the payment intent asynchronously with metadata
            intent = await self.stripe_service.create_payment_intent(
                amount=payment.amount,
                currency=payment.currency,
                payment_method_id=validated_data['payment_method_id'],
                metadata=metadata
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

        except SQLAlchemyError as db_error:
            db.session.rollback()
            logger.error(f"Database error during payment processing for Payment ID {payment_id}: {str(db_error)}")
            raise db_error

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