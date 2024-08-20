from app import db

class Role(db.Model):
    __tablename__ = 'roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)

    # Relationship with users (many-to-many)
    users = db.relationship('User', secondary='user_roles', back_populates='roles')

    # Relationship with permissions (many-to-many)
    permissions = db.relationship('Permission', secondary='role_permissions', back_populates='roles')

    def __repr__(self):
        return f'<Role {self.name}>'
