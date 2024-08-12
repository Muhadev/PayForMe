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

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False)
    
    user = relationship("User", back_populates="notifications")

    