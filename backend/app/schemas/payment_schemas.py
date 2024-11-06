# app/schemas/payment_schemas.py

from marshmallow import Schema, fields, validates, ValidationError, validates_schema, EXCLUDE
from app.config.stripe_config import StripeConfig
from marshmallow.validate import Length
from app.models.enums import PaymentStatus, PaymentMethod
from sqlalchemy import UniqueConstraint
from uuid import UUID
import re

class PaymentSchema(Schema):
    """Schema for validating payment processing details"""
    class Meta:
        unknown = EXCLUDE

    user_id = fields.Integer(required=True)  # Include user_id
    donation_id = fields.Integer(required=True)  # Include donation_id
    project_id = fields.Integer(required=True)
    amount = fields.Float(required=True)
    currency = fields.String(required=True)
    payment_method = fields.String(required=True)
    payment_method_id = fields.String(required=True)
    idempotency_key = fields.String(validate=Length(max=64), allow_none=True)
    billing_details = fields.Dict(keys=fields.String(), values=fields.String(), required=True)
    return_url = fields.URL(required=True)
    client_ip = fields.String(required=False)
    user_agent = fields.String(required=False)
    status = fields.String(dump_only=True, default=PaymentStatus.PENDING.value)

     # New fields for fee, net amount, and refund details
    fee_amount = fields.Float(dump_only=True)
    net_amount = fields.Float(dump_only=True)
    ip_address = fields.String(dump_only=True)
    billing_address = fields.Dict(dump_only=True)
    refund_reason = fields.String(dump_only=True)

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

        if value.get('country') not in StripeConfig.SUPPORTED_COUNTRIES:
            raise ValidationError("Unsupported country")

    @validates('idempotency_key')
    def validate_idempotency_key(self, value):
        try:
            UUID(str(value))
        except ValueError:
            raise ValidationError('Invalid idempotency key format')

    @validates("currency")
    def validate_currency(self, value):
        if value not in StripeConfig.SUPPORTED_CURRENCIES:
            raise ValidationError(f"Unsupported currency: {value}")

    @validates("amount")
    def validate_amount(self, value):
        if value <= 0:
            raise ValidationError("Amount must be greater than zero.")

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