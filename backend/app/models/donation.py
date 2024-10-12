from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from .enums import DonationStatus 
from app import db

class Donation(db.Model):
    __tablename__ = 'donations'

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, ForeignKey('projects.id'), nullable=False)

    user = db.relationship("User", back_populates="donations")
    project = db.relationship("Project", back_populates="donations")

    # Updated status field
    status = db.Column(db.Enum(DonationStatus), default=DonationStatus.PENDING)
    
    
    reward_id = db.Column(db.Integer, db.ForeignKey('rewards.id'))
    reward = db.relationship("Reward", back_populates="donations", foreign_keys=[reward_id])  # Specify the correct foreign key here

    # Add this db.relationship
    payment = db.relationship("Payment", back_populates="donation", uselist=False)

    def __repr__(self):
        return f'<Donation {self.amount} to Project {self.project_id}>'