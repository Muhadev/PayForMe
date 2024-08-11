from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app import db

class FAQ(db.Model):
    __tablename__ = 'faqs'

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    question = Column(String(255), nullable=False)
    answer = Column(Text, nullable=False)

    project = relationship("Project", back_populates="faqs")