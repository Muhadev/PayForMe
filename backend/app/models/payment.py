from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app import db
import enum

class PaymentStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentMethod(enum.Enum):
    CREDIT_CARD = "credit_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), nullable=False)  # e.g., 'USD', 'EUR'
    status = db.Column(db.Enum(PaymentStatus), nullable=False)
    method = db.Column(db.Enum(PaymentMethod), nullable=False)
    transaction_id = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    donation_id = db.Column(db.Integer, ForeignKey('donations.id'), nullable=False)

    user = db.relationship("User", back_populates="payments")
    donation = db.relationship("Donation", back_populates="payment")

    def __repr__(self):
        return f'<Payment {self.id} - {self.amount} {self.currency}>'