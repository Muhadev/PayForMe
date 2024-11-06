import os
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

class PaymentConfig:
    # Minimum allowed payment amount by default
    MINIMUM_PAYMENT_AMOUNT = float(os.getenv('MINIMUM_PAYMENT_AMOUNT', 1.00))  # Default to $1.00
    
    # Idempotency key time-to-live in seconds (e.g., 24 hours)
    IDEMPOTENCY_KEY_TTL = timedelta(hours=int(os.getenv('IDEMPOTENCY_KEY_TTL_HOURS', 24)))
    
    # Default currency if none is specified
    DEFAULT_CURRENCY = os.getenv('DEFAULT_CURRENCY', 'USD')
    
    # Transaction limits
    MAX_PAYMENT_AMOUNT = float(os.getenv('MAX_PAYMENT_AMOUNT', 10000.00))  # Example limit of $10,000.00

    # Logging for critical payment errors
    LOG_LEVEL = os.getenv('PAYMENT_LOG_LEVEL', 'ERROR')

    # Retry settings for payment processing
    PAYMENT_MAX_RETRIES = int(os.getenv('PAYMENT_MAX_RETRIES', 3))
    PAYMENT_RETRY_DELAY = int(os.getenv('PAYMENT_RETRY_DELAY', 5))  # Delay in seconds
    
    # Payment expiration or cache settings
    PAYMENT_EXPIRATION_MINUTES = int(os.getenv('PAYMENT_EXPIRATION_MINUTES', 30))  # E.g., 30 minutes

    @classmethod
    def validate_config(cls):
        if cls.MINIMUM_PAYMENT_AMOUNT <= 0:
            logger.error("Minimum payment amount must be greater than zero.")
            raise ValueError("Invalid configuration: MINIMUM_PAYMENT_AMOUNT must be positive.")
        if cls.MAX_PAYMENT_AMOUNT < cls.MINIMUM_PAYMENT_AMOUNT:
            logger.error("Maximum payment amount cannot be less than minimum payment amount.")
            raise ValueError("Invalid configuration: MAX_PAYMENT_AMOUNT must be greater than MINIMUM_PAYMENT_AMOUNT.")

# Validate configuration on import
PaymentConfig.validate_config()
