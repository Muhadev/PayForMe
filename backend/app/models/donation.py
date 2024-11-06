from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .enums import DonationStatus
from sqlalchemy import UniqueConstraint
from app import db

class Donation(db.Model):
    __tablename__ = 'donations'

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), onupdate=func.now())
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, ForeignKey('projects.id'), nullable=False)

    user = db.relationship("User", back_populates="donations")
    project = db.relationship("Project", back_populates="donations")

    recurring = db.Column(db.Boolean, default=False)
    anonymous = db.Column(db.Boolean, default=False)
    gift_aid = db.Column(db.Boolean, default=False)
    
    # Updated status field
    status = db.Column(db.Enum(DonationStatus), default=DonationStatus.PENDING)
    
    
    reward_id = db.Column(db.Integer, db.ForeignKey('rewards.id'), nullable=True)
    reward = db.relationship("Reward", back_populates="donations", foreign_keys=[reward_id])  # Specify the correct foreign key here

    # Add this db.relationship
    payment = db.relationship("Payment", back_populates="donation", uselist=False)

    idempotency_key = db.Column(db.String(64), nullable=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'project_id', 'amount', 'idempotency_key', name='uq_donation_idempotency'),
    )

    def __repr__(self):
        return f'<Donation {self.amount} to Project {self.project_id}>'