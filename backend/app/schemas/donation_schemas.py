from marshmallow import Schema, fields, validates, ValidationError, validates_schema, EXCLUDE
from datetime import datetime
import re
from .enums import PaymentMethod, DonationStatus
from app.config import StripeConfig  # Import StripeConfig to access configuration

class DonationSchema(Schema):
    """Schema for validating donation requests"""
    project_id = fields.Integer(required=True)
    amount = fields.Float(required=True)
    currency = fields.String(required=True, default='USD')
    reward_id = fields.Integer(allow_none=True)
    payment_method = fields.String(required=True, default='CREDIT_CARD')
    recurring = fields.Boolean(required=False, default=False)
    anonymous = fields.Boolean(required=False, default=False)
    gift_aid = fields.Boolean(required=False, default=False)
    id = fields.Integer(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    status = fields.String(dump_only=True)

    @validates('project_id')
    def validate_project(self, value):
        project = Project.query.get(value)
        if not project:
            raise ValidationError('Invalid project')
        if project.status != ProjectStatus.ACTIVE:
            raise ValidationError('Project is not active')

    @validates('reward_id')
    def validate_reward(self, value):
        if value is not None:
            reward = Reward.query.get(value)
            if not reward or reward.project_id != self.project_id:
                raise ValidationError('Invalid reward or reward not associated with the selected project.')

    @validates("currency")
    def validate_currency(self, value):
        if value not in StripeConfig.SUPPORTED_CURRENCIES:
            raise ValidationError(f"Currency must be one of: {', '.join(StripeConfig.SUPPORTED_CURRENCIES)}")

    @validates("amount")
    def validate_amount(self, value):
        currency = self.context.get("currency", "USD")
        min_amount = StripeConfig.MINIMUM_AMOUNT.get(currency, 1.00)
        if value < min_amount:
            raise ValidationError(f"Minimum donation amount for {currency} is {min_amount}")

    @validates_schema
    def validate_donation(self, data, **kwargs):
        if data.get('gift_aid') and data['currency'] != 'GBP':
            raise ValidationError('Gift Aid is only available for GBP donations')

    @validates('payment_method')
    def validate_payment_method(self, value):
        try:
            PaymentMethod[value.upper()]
        except KeyError:
            raise ValidationError('Invalid payment method')

class PaymentDetailsSchema(Schema):
    """Schema for validating payment processing details"""
    class Meta:
        unknown = EXCLUDE

    payment_method_id = fields.String(required=True)
    idempotency_key = fields.UUID(required=True)
    billing_details = fields.Dict(keys=fields.String(), values=fields.String(), required=True)
    return_url = fields.URL(required=True)
    metadata = fields.Dict(keys=fields.String(), values=fields.String(), required=False)
    client_ip = fields.String(required=False)
    user_agent = fields.String(required=False)

    @validates('billing_details')
    def validate_billing_details(self, value):
        required_fields = ['name', 'email', 'address_line1', 'city', 'country', 'postal_code']
        missing_fields = [field for field in required_fields if field not in value]
        if missing_fields:
            raise ValidationError(f"Missing required billing fields: {', '.join(missing_fields)}")

        if not re.match(r"[^@]+@[^@]+\.[^@]+", value.get('email', '')):
            raise ValidationError("Invalid email format")
        
        if not value.get('postal_code', '').strip():
            raise ValidationError("Invalid postal code")

        # Use StripeConfig for valid countries
        if value.get('country') not in StripeConfig.SUPPORTED_COUNTRIES:
            raise ValidationError("Unsupported country")

    @validates('idempotency_key')
    def validate_idempotency_key(self, value):
        if not value or len(str(value)) < 8:
            raise ValidationError('Invalid idempotency key')

class RefundSchema(Schema):
    """Schema for validating refund requests"""
    reason = fields.String(required=True, validate=lambda x: len(x.strip()) >= 10)
    refund_amount = fields.Float(required=False)
    notify_customer = fields.Boolean(required=False, default=True)
    refund_application_fee = fields.Boolean(required=False, default=False)
    reverse_transfer = fields.Boolean(required=False, default=False)
    
    @validates_schema
    def validate_refund(self, data, **kwargs):
        if 'refund_amount' in data and data['refund_amount'] <= 0:
            raise ValidationError("Refund amount must be greater than 0")
