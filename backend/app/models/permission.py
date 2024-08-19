
from app import db

class Permission(db.Model):
    __tablename__ = 'permissions'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)

    # Relationship with roles (many-to-many)
    roles = db.relationship('Role', secondary='role_permissions', back_populates='permissions')

    def __repr__(self):
        return f'<Permission {self.name}>'
