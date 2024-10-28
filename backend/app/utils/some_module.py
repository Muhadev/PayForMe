class ConfigurationError(Exception):
    """Raised when a critical configuration is missing or invalid."""
    def __init__(self, message):
        super().__init__(message)


class PaymentError(Exception):
    """Custom error class for handling payment-related issues"""
    def __init__(self, message: str, code: str, raw_error: Exception = None):
        super().__init__(message)
        self.code = code
        self.raw_error = raw_error
