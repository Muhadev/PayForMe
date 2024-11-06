# app/schemas/donation_schemas.py

from marshmallow import Schema, fields, validates, ValidationError, validates_schema, EXCLUDE
from datetime import datetime
from marshmallow.validate import Length
from app.models.enums import PaymentMethod, DonationStatus
from app.config.stripe_config import StripeConfig

from app.models import Project, Reward
from app.models.enums import ProjectStatus

class DonationSchema(Schema):
    """Schema for validating donation requests"""
    class Meta:
        unknown = EXCLUDE
    project_id = fields.Integer(required=True)
    amount = fields.Float(required=True)
    currency = fields.String(required=True, default='USD')
    reward_id = fields.Integer(allow_none=True)
    payment_method = fields.String(required=True, default='CREDIT_CARD')
    recurring = fields.Boolean(default=False)
    anonymous = fields.Boolean(default=False)
    gift_aid = fields.Boolean(default=False)
    id = fields.Integer(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    status = fields.String(dump_only=True, default=DonationStatus.PENDING.value)
    idempotency_key = fields.String(validate=Length(max=64), allow_none=True)


    @validates('project_id')
    def validate_project(self, value):
        project = Project.query.get(value)
        if not project:
            raise ValidationError('Invalid project')
        if project.status != ProjectStatus.ACTIVE:
            raise ValidationError('Project is not active')

    @validates('reward_id')
    def validate_reward(self, value):
        project_id = self.context.get("project_id")
        if value is not None and project_id is not None:
            reward = Reward.query.get(value)
            if not reward or reward.project_id != project_id:
                raise ValidationError('Invalid reward or reward not associated with the selected project.')

    @validates("currency")
    def validate_currency(self, value):
        if value not in StripeConfig.SUPPORTED_CURRENCIES:
            raise ValidationError(f"Currency must be one of: {', '.join(StripeConfig.SUPPORTED_CURRENCIES)}")

    @validates("amount")
    def validate_amount(self, value):
        if value <= 0:
            raise ValidationError("Donation amount must be greater than zero.")
        
        currency = self.context.get("currency", "USD")
        min_amount = StripeConfig.MINIMUM_AMOUNT.get(currency, 1.00)
        if value < min_amount:
            raise ValidationError(f"Minimum donation amount for {currency} is {min_amount}.")

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
