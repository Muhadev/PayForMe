from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from datetime import date

class RewardSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True, validate=[
        validate.Length(min=1, max=100),
        validate.Regexp(r'^[\w\s-]+$', error='Title contains invalid characters')
    ])
    description = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    minimum_amount = fields.Float(required=True, validate=[  # Changed from Decimal to Float
        validate.Range(min=0),
        validate.Range(max=1000000)
    ])
    quantity_available = fields.Int(allow_none=True, validate=validate.Range(min=1))
    estimated_delivery_date = fields.Date(
        allow_none=True,
    )
    shipping_type = fields.Str(validate=validate.OneOf(['domestic', 'international', 'none']))
    project_id = fields.Int(dump_only=True)
    quantity_claimed = fields.Int(dump_only=True)

    @validates_schema
    def validate_dates(self, data, **kwargs):
        if 'estimated_delivery_date' in data and data['estimated_delivery_date']:
            if data['estimated_delivery_date'].date() < date.today():
                raise ValidationError('Estimated delivery date must be in the future')

class RewardUpdateSchema(RewardSchema):
    title = fields.Str(validate=[
        validate.Length(min=1, max=100),
        validate.Regexp(r'^[\w\s-]+$', error='Title contains invalid characters')
    ])
    description = fields.Str(validate=validate.Length(min=1, max=500))
    minimum_amount = fields.Float(validate=[  # Changed from Decimal to Float
        validate.Range(min=0),
        validate.Range(max=1000000)
    ])
    quantity_available = fields.Int(allow_none=True, validate=validate.Range(min=1))
    estimated_delivery_date = fields.Date(
        allow_none=True,
    )
    shipping_type = fields.Str(validate=validate.OneOf(['domestic', 'international', 'none']))