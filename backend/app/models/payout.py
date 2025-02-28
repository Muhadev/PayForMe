# app/models/payout.py
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app import db
from enum import Enum as PyEnum

class PayoutStatus(PyEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Payout(db.Model):
    __tablename__ = 'payouts'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    fee_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    status = db.Column(db.Enum(PayoutStatus), default=PayoutStatus.PENDING)
    stripe_payout_id = db.Column(db.String(255), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now())
    processed_at = db.Column(db.DateTime, nullable=True)
    failure_reason = db.Column(db.String(255), nullable=True)
    bank_account_id = db.Column(db.String(255), nullable=True)  # Reference to saved Stripe Connect account
    
    # Relationships
    project = db.relationship("Project", back_populates="payouts")
    user = db.relationship("User", back_populates="payouts")
    
    def __repr__(self):
        return f'<Payout {self.amount} {self.currency} for Project {self.project_id}>'