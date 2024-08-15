from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app import db

class ProjectUpdate(db.Model):
    __tablename__ = 'project_updates'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    project_id = db.Column(db.Integer, ForeignKey('projects.id'), nullable=False)

    project = db.relationship("Project", back_populates="project_updates")

    def __repr__(self):
        return f'<Project Update {self.id} for Project {self.project_id}>'