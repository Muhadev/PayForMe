from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from app import db
import enum

class NotificationType(enum.Enum):
    PROJECT_UPDATE = "project_update"
    NEW_BACKER = "new_backer"
    FUNDING_GOAL_REACHED = "funding_goal_reached"
    COMMENT_RECEIVED = "comment_received"
    REWARD_SHIPPED = "reward_shipped"

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False, index=True)
    type = db.Column(db.Enum(NotificationType), nullable=False)
    message = db.Column(db.Text, nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False)
    project_id = db.Column(db.Integer, ForeignKey('projects.id'), nullable=True)
    
    user = db.relationship("User", back_populates="notifications")

    