# app/models/saved_project.py

from app import db
from datetime import datetime

class SavedProject(db.Model):
    __tablename__ = 'saved_projects'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", back_populates="saved_projects")
    project = db.relationship("Project", back_populates="saved_by_users")
    
    # Define unique constraint to prevent duplicate saves
    __table_args__ = (
        db.UniqueConstraint('user_id', 'project_id', name='uix_user_project'),
    )
    
    def __repr__(self):
        return f'<SavedProject user_id={self.user_id} project_id={self.project_id}>'