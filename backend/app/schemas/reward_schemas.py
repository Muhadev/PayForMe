from marshmallow import Schema, fields, validate
from datetime import date  # Import just date, not datetime

class RewardSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True, validate=[
        validate.Length(min=1, max=100),
        validate.Regexp(r'^[\w\s-]+$', error='Title contains invalid characters')
    ])
    description = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    minimum_amount = fields.Decimal(required=True, validate=[
        validate.Range(min=0),
        validate.Range(max=1000000)
    ])
    quantity_available = fields.Int(allow_none=True, validate=validate.Range(min=1))
    estimated_delivery_date = fields.Date(
        allow_none=True,
        validate=validate.Range(min=date.today())  # Use date.today() directly
    )
    shipping_type = fields.Str(validate=validate.OneOf(['domestic', 'international', 'none']))
    project_id = fields.Int(dump_only=True)
    quantity_claimed = fields.Int(dump_only=True)

class RewardUpdateSchema(Schema):
    title = fields.Str(validate=[
        validate.Length(min=1, max=100),
        validate.Regexp(r'^[\w\s-]+$', error='Title contains invalid characters')
    ])
    description = fields.Str(validate=validate.Length(min=1, max=500))
    minimum_amount = fields.Decimal(validate=[
        validate.Range(min=0),
        validate.Range(max=1000000)
    ])
    quantity_available = fields.Int(allow_none=True, validate=validate.Range(min=1))
    estimated_delivery_date = fields.Date(
        allow_none=True,
        validate=validate.Range(min=date.today())  # Use date.today() here as well
    )
    shipping_type = fields.Str(validate=validate.OneOf(['domestic', 'international', 'none']))