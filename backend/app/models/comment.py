from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app import db

class Comment(db.Model):
    __tablename__ = 'comments'

    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)

    user = relationship("User", back_populates="comments")
    project = relationship("Project", back_populates="comments")

    def __repr__(self):
        return f'<Comment by User {self.user_id} on Project {self.project_id}>'