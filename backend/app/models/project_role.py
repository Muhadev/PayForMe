# app/models/project_role.py
from app import db
from datetime import datetime

class ProjectRole(db.Model):
    __tablename__ = 'project_roles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define relationship without backref to avoid circular reference
    project = db.relationship('Project', back_populates='project_roles')
    user = db.relationship('User', back_populates='project_roles')
    
    def __repr__(self):
        return f'<ProjectRole {self.role} for User {self.user_id} on Project {self.project_id}>'