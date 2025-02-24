from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .enums import DonationStatus
from sqlalchemy import UniqueConstraint
from app import db

class Donation(db.Model):
    __tablename__ = 'donations'

    
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), onupdate=func.now())
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, ForeignKey('projects.id'), nullable=False)
    status = db.Column(db.Enum(DonationStatus), default=DonationStatus.PENDING)
    payment_session_id = db.Column(db.String(255), unique=True, nullable=True)
    payment_id = db.Column(db.String(255), unique=True, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    reward_id = db.Column(db.Integer, db.ForeignKey('rewards.id'), nullable=True)
    failure_reason = db.Column(db.String(255), nullable=True)
    failed_at = db.Column(db.DateTime, nullable=True)
    refunded_at = db.Column(db.DateTime, nullable=True)
    refund_amount = db.Column(db.Float, nullable=True)
    # Relationships
    user = db.relationship("User", back_populates="donations")
    project = db.relationship("Project", back_populates="donations")
    reward = db.relationship("Reward", back_populates="donations", foreign_keys=[reward_id])

    def __repr__(self):
        return f'<Donation {self.amount} {self.currency} to Project {self.project_id}>'