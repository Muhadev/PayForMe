# app/schemas/backer_schemas.py

from marshmallow import Schema, fields, validate, ValidationError, pre_load, post_load
from decimal import Decimal, InvalidOperation

def validate_positive(n):
    if n <= 0:
        raise ValidationError("Value must be greater than 0.")

class BackProjectSchema(Schema):
    amount = fields.Decimal(
        required=True,
        validate=[validate.Range(min=Decimal('0.01'))],
        places=2,
        as_string=True,
        error_messages={
            'invalid': 'Not a valid decimal number.',
            'required': 'Amount is required.'
        }
    )
    reward_id = fields.Integer(required=False, allow_none=True)
    currency = fields.String(
        required=False,
        default='USD',
        validate=validate.OneOf(['USD', 'EUR', 'GBP'])
    )

    @pre_load
    def convert_amount(self, data, **kwargs):
        if 'amount' in data:
            # Handle both string and numeric inputs
            try:
                # Convert to string first to handle both int/float inputs
                amount_str = str(data['amount'])
                # Validate it can be converted to Decimal
                Decimal(amount_str)
                data['amount'] = amount_str
            except (InvalidOperation, TypeError):
                raise ValidationError("Invalid amount format")
        return data

    @post_load
    def ensure_decimal(self, data, **kwargs):
        # Ensure amount is Decimal after loading
        if 'amount' in data:
            try:
                data['amount'] = Decimal(str(data['amount'])).quantize(Decimal('0.01'))
            except (InvalidOperation, TypeError):
                raise ValidationError("Invalid amount format")
        return data

class ProjectUpdateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    content = fields.String(required=True, validate=validate.Length(min=1))

class ProjectMilestoneSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(required=True, validate=validate.Length(min=1))