from marshmallow import Schema, fields, validate, ValidationError

def validate_positive(n):
    if n <= 0:
        raise ValidationError("Value must be greater than 0.")

class BackProjectSchema(Schema):
    amount = fields.Decimal(required=True, validate=[validate.Range(min=0.01), validate_positive])
    reward_id = fields.Integer(required=False, allow_none=True)  # Make it optional
    currency = fields.String(required=False, default='USD', 
                           validate=validate.OneOf(['USD', 'EUR', 'GBP']))

class ProjectUpdateSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    content = fields.String(required=True, validate=validate.Length(min=1))

class ProjectMilestoneSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(required=True, validate=validate.Length(min=1))