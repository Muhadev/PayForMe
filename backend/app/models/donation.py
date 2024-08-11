from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from app import db

class Donation(db.Model):
    __tablename__ = 'donations'

    id = Column(Integer, primary_key=True)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)

    user = relationship("User", back_populates="donations")
    project = relationship("Project", back_populates="donations")

    # Add these fields to the Donation model
    status = Column(Enum('pending', 'completed', 'refunded'), default='pending')
    
    # Add this relationship
    payment = relationship("Payment", back_populates="donation", uselist=False)