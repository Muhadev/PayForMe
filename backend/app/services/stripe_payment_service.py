import stripe
from datetime import datetime
from app import db
from app.models import Payment, PaymentStatus
from app.config import StripeConfig
from some_module import ConfigurationError

class StripePaymentService:
    def __init__(self):
        if not StripeConfig.SECRET_KEY:
            raise ConfigurationError("Stripe secret key not configured")
        stripe.api_key = StripeConfig.SECRET_KEY
        self.webhook_secret = StripeConfig.WEBHOOK_SECRET

    async def create_payment_intent(self, amount: float, currency: str, payment_method_id: str, metadata: dict = None) -> dict:
        """Create a Stripe PaymentIntent"""
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency.lower(),
                payment_method=payment_method_id,
                confirmation_method='manual',
                confirm=True,
                metadata=metadata or {},
                return_url=StripeConfig.PAYMENT_RETURN_URL
            )
            return intent
        except stripe.error.StripeError as e:
            raise self._handle_stripe_error(e)

    async def confirm_payment_intent(self, payment_intent_id: str) -> dict:
        """Confirm a PaymentIntent to finalize the payment"""
        try:
            intent = stripe.PaymentIntent.confirm(payment_intent_id)
            return intent
        except stripe.error.StripeError as e:
            raise self._handle_stripe_error(e)

    async def process_refund(self, payment_intent_id: str, amount: float = None, reason: str = None) -> dict:
        """Process a refund through Stripe"""
        try:
            refund_params = {
                'payment_intent': payment_intent_id,
                'reason': reason or 'requested_by_customer'
            }
            if amount:
                refund_params['amount'] = int(amount * 100)  # Convert to cents

            refund = stripe.Refund.create(**refund_params)
            return refund
        except stripe.error.StripeError as e:
            raise self._handle_stripe_error(e)

    def verify_webhook(self, payload: str, sig_header: str) -> dict:
        """Verify Stripe webhook signature to confirm event authenticity"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid webhook signature")

    def _handle_stripe_error(self, error: stripe.error.StripeError) -> Exception:
        """Handle Stripe errors by mapping them to application-specific errors"""
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
        
        # Log error for traceability (e.g., for security and debugging purposes)
        print(f"Stripe error: {message} - {str(error)}")

        return PaymentError(
            message=f"{message}: {str(error)}",
            code=code,
            raw_error=error
        )

class PaymentError(Exception):
    """Custom error class for handling payment-related issues"""
    def __init__(self, message: str, code: str, raw_error: Exception = None):
        super().__init__(message)
        self.code = code
        self.raw_error = raw_error