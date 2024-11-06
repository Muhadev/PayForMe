# app/utils/payment_helpers.py
from typing import Optional, Dict
from marshmallow import ValidationError
import logging
from app.models import Payment
from app.config.stripe_config import StripeConfig
from app.config.payment_config import PaymentConfig

logger = logging.getLogger(__name__)

def get_payment_metadata(billing_details: Optional[dict] = None,
                         payment_method: Optional[str] = None,
                         idempotency_key: Optional[str] = None) -> Dict:
    """
    Helper function to generate structured metadata for payments.
    """
    metadata = billing_details or {}
    if payment_method:
        metadata['payment_method'] = payment_method
    if idempotency_key:
        metadata['idempotency_key'] = idempotency_key
    return metadata


async def validate_payment_request(payment_details: dict, schema) -> dict:
    """Validate payment request using schema and custom checks."""
    try:
        # Load and validate data synchronously
        validated_data = schema.load(payment_details)
    except ValidationError as ve:
        logger.error(f"Schema validation failed: {ve.messages}")
        raise ValueError(f"Validation failed: {ve.messages}")

    # Custom validation for currency and amount
    currency = validated_data.get('currency')
    amount = validated_data.get('amount')

    if currency not in StripeConfig.SUPPORTED_CURRENCIES:
        logger.error(f"Unsupported currency: {currency}")
        raise ValueError(f"Unsupported currency: {currency}")

    min_amount = StripeConfig.MINIMUM_AMOUNT.get(currency, 0.5)
    if amount < min_amount:
        logger.error(f"Amount {amount} is below minimum for {currency}: {min_amount}")
        raise ValueError(f"Amount below minimum for {currency}: {min_amount}")

    return validated_data

async def apply_rate_limit(redis_client, user_id: int):
    """Helper function for rate-limiting payment attempts."""
    key = f"rate_limit:payment_attempts:{user_id}"
    attempts = await redis_client.get(key)
    if attempts and int(attempts) >= StripeConfig.RATE_LIMIT_ATTEMPTS:
        raise ValueError("Too many payment attempts. Please try again later.")
    await redis_client.incr(key)
    await redis_client.expire(key, StripeConfig.RATE_LIMIT_WINDOW)

async def check_idempotency(redis_client, idempotency_key: str, context: dict) -> Optional[Payment]:
    """Check for existing payment with same idempotency key"""
    if not idempotency_key:
        return None

    cache_key = f"idempotency:{idempotency_key}"
    cached_result = await redis_client.get(cache_key)
    
    if cached_result:
        return await Payment.query.get(int(cached_result))
    
    existing_payment = await Payment.query.filter_by(idempotency_key=idempotency_key, **context).first()
    
    if existing_payment:
        await redis_client.setex(
            cache_key,
            PaymentConfig.IDEMPOTENCY_KEY_TTL.total_seconds(),
            str(existing_payment.id)
        )
    
    return existing_payment