from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app import db

class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, ForeignKey('projects.id'), nullable=False)

    user = db.relationship("User", back_populates="comments")
    project = db.relationship("Project", back_populates="comments")

    def __repr__(self):
        return f'<Comment by User {self.user_id} on Project {self.project_id}>'