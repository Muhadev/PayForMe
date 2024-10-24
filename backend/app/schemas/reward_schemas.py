# schemas/reward_schemas.py
from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from datetime import date, datetime

class RewardSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True, validate=[
        validate.Length(min=1, max=100),
        validate.Regexp(r'^[\w\s-]+$', error='Title contains invalid characters')
    ])
    description = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    minimum_amount = fields.Float(required=True, validate=[
        validate.Range(min=0),
        validate.Range(max=1000000)
    ])
    quantity_available = fields.Int(allow_none=True, validate=validate.Range(min=1))
    estimated_delivery_date = fields.Date(allow_none=True)
    shipping_type = fields.Str(validate=validate.OneOf(['domestic', 'international', 'none']))
    project_id = fields.Int(dump_only=True)
    quantity_claimed = fields.Int(dump_only=True)

    @validates_schema
    def validate_dates(self, data, **kwargs):
        if 'estimated_delivery_date' in data and data['estimated_delivery_date']:
            delivery_date = data['estimated_delivery_date']
            today = date.today()
            
            # Convert datetime to date if necessary
            if isinstance(delivery_date, datetime):
                delivery_date = delivery_date.date()
            
            if delivery_date < today:
                raise ValidationError('Estimated delivery date must be in the future')

class RewardUpdateSchema(RewardSchema):
    title = fields.Str(validate=[
        validate.Length(min=1, max=100),
        validate.Regexp(r'^[\w\s-]+$', error='Title contains invalid characters')
    ], required=False)
    description = fields.Str(validate=validate.Length(min=1, max=500), required=False)
    minimum_amount = fields.Float(validate=[
        validate.Range(min=0),
        validate.Range(max=1000000)
    ], required=False)
    quantity_available = fields.Int(allow_none=True, validate=validate.Range(min=1), required=False)
    estimated_delivery_date = fields.Date(allow_none=True, required=False)
    shipping_type = fields.Str(validate=validate.OneOf(['domestic', 'international', 'none']), required=False)