# # seed_rewards.py
# from app import create_app, db # Assuming this imports your app and sets up the db session
# from app.models.project import Project
# from app.models.reward import Reward
# from datetime import datetime

# def seed_rewards():
#     project = Project.query.get(90)  # Ensure project ID 90 exists in your database

#     if project is None:
#         print("Project with ID 90 does not exist.")
#         return

#     rewards = [
#         Reward(
#             project_id=project.id,
#             title="Bronze Supporter",
#             description="A thank you note for your contribution.",
#             minimum_amount=10.0,
#             estimated_delivery=datetime(2024, 12, 31),
#             quantity_available=100
#         ),
#         Reward(
#             project_id=project.id,
#             title="Silver Supporter",
#             description="A custom t-shirt for your support.",
#             minimum_amount=50.0,
#             estimated_delivery=datetime(2024, 12, 31),
#             quantity_available=50
#         ),
#         Reward(
#             project_id=project.id,
#             title="Gold Supporter",
#             description="Exclusive invitation to project launch event.",
#             minimum_amount=100.0,
#             estimated_delivery=datetime(2024, 12, 31),
#             quantity_available=20
#         )
#     ]

#     # Add rewards to the database
#     db.session.add_all(rewards)
#     db.session.commit()
#     print("Rewards added successfully!")

# if __name__ == '__main__':
#     seed_rewards()


# app/schemas/donation_schemas.py
from marshmallow import Schema, fields, validates, ValidationError, validates_schema, EXCLUDE
from datetime import datetime
import re

class PaymentDetailsSchema(Schema):
    """Enhanced schema for validating payment processing details"""
    class Meta:
        unknown = EXCLUDE  # Ignore unknown fields
    
    payment_method_id = fields.String(required=True)
    idempotency_key = fields.UUID(required=True)  # Use UUID for better uniqueness
    billing_details = fields.Dict(keys=fields.String(), values=fields.String(), required=True)
    return_url = fields.URL(required=True)  # URL to redirect after payment
    metadata = fields.Dict(keys=fields.String(), values=fields.String(), required=False)
    client_ip = fields.String(required=False)
    user_agent = fields.String(required=False)
    
    @validates('billing_details')
    def validate_billing_details(self, value):
        required_fields = ['name', 'email', 'address_line1', 'city', 'country', 'postal_code']
        missing_fields = [field for field in required_fields if field not in value]
        if missing_fields:
            raise ValidationError(f"Missing required billing fields: {', '.join(missing_fields)}")
        
        # Validate email format
        if not re.match(r"[^@]+@[^@]+\.[^@]+", value.get('email', '')):
            raise ValidationError("Invalid email format")
        
        # Validate postal code format (basic check)
        if not value.get('postal_code', '').strip():
            raise ValidationError("Invalid postal code")
            
        # Validate country code
        valid_countries = {'US', 'CA', 'GB', 'FR', 'DE', 'AU'}  # Add supported countries
        if value.get('country') not in valid_countries:
            raise ValidationError("Unsupported country")

class RefundSchema(Schema):
    """Enhanced schema for validating refund requests"""
    reason = fields.String(required=True, validate=lambda x: len(x.strip()) >= 10)
    refund_amount = fields.Float(required=False)
    notify_customer = fields.Boolean(required=False, default=True)
    refund_application_fee = fields.Boolean(required=False, default=False)
    reverse_transfer = fields.Boolean(required=False, default=False)
    
    @validates_schema
    def validate_refund(self, data, **kwargs):
        if 'refund_amount' in data:
            if data['refund_amount'] <= 0:
                raise ValidationError("Refund amount must be greater than 0")
            # Additional validation can be added here for maximum refund amount

class DonationSchema(Schema):
    """Enhanced schema for validating donation requests"""
    project_id = fields.Integer(required=True, strict=True)
    amount = fields.Float(required=True, strict=True)
    currency = fields.String(required=True, default='USD')
    reward_id = fields.Integer(allow_none=True, strict=True)
    payment_method = fields.String(required=True, default='CREDIT_CARD')
    recurring = fields.Boolean(required=False, default=False)
    anonymous = fields.Boolean(required=False, default=False)
    gift_aid = fields.Boolean(required=False, default=False)  # For UK donations
    
    @validates('amount')
    def validate_amount(self, value):
        if value <= 0:
            raise ValidationError('Amount must be greater than 0')
        if value > 1000000:
            raise ValidationError('Amount exceeds maximum allowed')
        
        # Validate amount precision (2 decimal places)
        if round(value, 2) != value:
            raise ValidationError('Amount cannot have more than 2 decimal places')
    
    @validates_schema
    def validate_donation(self, data, **kwargs):
        # Check currency-specific minimum amounts
        currency_minimums = {
            'USD': 1.00,
            'EUR': 1.00,
            'GBP': 1.00,
            'CAD': 1.00,
            'AUD': 1.00
        }
        
        min_amount = currency_minimums.get(data['currency'])
        if min_amount and data['amount'] < min_amount:
            raise ValidationError(f'Minimum donation amount for {data["currency"]} is {min_amount}')
        
        # Validate gift aid eligibility
        if data.get('gift_aid') and data['currency'] != 'GBP':
            raise ValidationError('Gift Aid is only available for GBP donations')

# app/services/payment_service.py

class PaymentService:
    def __init__(self):
        self.stripe_service = StripePaymentService()
        self.payment_details_schema = PaymentDetailsSchema()
        self.refund_schema = RefundSchema()
        self.redis_client = Redis.from_url(Config.REDIS_URL)
        
    async def create_payment_session(self, payment_details):
        """Create a Stripe payment session for client-side processing"""
        try:
            validated_data = self.payment_details_schema.load(payment_details)
            
            # Check for duplicate payment attempts
            if await self._is_duplicate_payment(validated_data['idempotency_key']):
                raise ValueError("Duplicate payment attempt detected")
            
            # Create payment session
            session = await self.stripe_service.create_payment_session(
                amount=payment_details['amount'],
                currency=payment_details['currency'],
                payment_method_types=['card'],
                billing_details=validated_data['billing_details'],
                metadata={
                    'idempotency_key': str(validated_data['idempotency_key']),
                    'client_ip': validated_data.get('client_ip'),
                    'user_agent': validated_data.get('user_agent')
                },
                return_url=validated_data['return_url']
            )
            
            return {
                'session_id': session.id,
                'client_secret': session.client_secret,
                'payment_methods': session.payment_method_types
            }
            
        except Exception as e:
            logger.error(f"Payment session creation failed: {str(e)}", exc_info=True)
            raise
            
    async def _is_duplicate_payment(self, idempotency_key):
        """Check for duplicate payment attempts using Redis"""
        key = f"payment:idempotency:{idempotency_key}"
        exists = await self.redis_client.exists(key)
        if not exists:
            await self.redis_client.setex(key, 3600, '1')  # Store for 1 hour
        return exists