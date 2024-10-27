# app/models/payment.py

from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app import db
from sqlalchemy.sql import func
from .enums import PaymentStatus, PaymentMethod, PaymentProvider
from app.config import StripeConfig

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), nullable=False)  # e.g., 'USD', 'EUR'
    status = db.Column(db.Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    method = db.Column(db.Enum(PaymentMethod), nullable=False, default=PaymentMethod.CREDIT_CARD)
    provider = db.Column(db.Enum(PaymentProvider), nullable=False, default=PaymentProvider.STRIPE)
    transaction_id = db.Column(db.String(100), unique=True)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(DateTime(timezone=True), onupdate=func.now())
    error_message = db.Column(db.String(500))
    payment_metadata = db.Column(db.JSON)
    
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    donation_id = db.Column(db.Integer, ForeignKey('donations.id'), nullable=False)

    user = db.relationship("User", back_populates="payments")
    donation = db.relationship("Donation", back_populates="payment")

    ip_address = db.Column(db.String(45))  # Store IP for fraud detection
    billing_address = db.Column(db.JSON)    # Store billing details
    fee_amount = db.Column(db.Float)        # Platform/processing fee
    net_amount = db.Column(db.Float)        # Amount after fees
    refund_reason = db.Column(db.String(200))
    # Add missing indexes
    __table_args__ = (
        db.Index('idx_user_id', 'user_id'),
        db.Index('idx_donation_id', 'donation_id'),
        db.Index('idx_status_created_at', 'status', 'created_at'),
    )
    
    # Add audit fields
    updated_by = db.Column(db.Integer, ForeignKey('users.id'))
    ip_country = db.Column(db.String(2))  # Country code for fraud detection
    
    # Add payment verification
    def verify_amount(self, expected_amount):
        return abs(self.amount - expected_amount) < 0.01
    
    def calculate_fees(self):
        """Calculate platform and processing fees"""
        stripe_fee = (self.amount * StripeConfig.STRIPE_FEE_PERCENT) + StripeConfig.STRIPE_FEE_FIXED
        platform_fee = self.amount * StripeConfig.PLATFORM_FEE_PERCENT
        self.fee_amount = stripe_fee + platform_fee
        self.net_amount = self.amount - self.fee_amount


    def to_dict(self):
        """Convert payment to dictionary for API responses"""
        return {
            'id': self.id,
            'amount': self.amount,
            'currency': self.currency,
            'status': self.status.value,
            'method': self.method.value,
            'created_at': self.created_at.isoformat(),
            'transaction_id': self.transaction_id,
            'net_amount': self.net_amount,
            'fee_amount': self.fee_amount
        }

    def __repr__(self):
        return f'<Payment {self.id} - {self.amount} {self.currency} - {self.status.value}>'

    def update_status(self, new_status, error_message=None):
        """Update payment status with optional error message"""
        self.status = PaymentStatus.from_string(new_status)
        if error_message:
            self.error_message = error_message
        self.updated_at = datetime.utcnow()

    def is_successful(self):
        """Check if payment was successful"""
        return self.status == PaymentStatus.COMPLETED

    def is_pending(self):
        """Check if payment is still pending"""
        return self.status == PaymentStatus.PENDING

    def is_failed(self):
        """Check if payment failed"""
        return self.status in [PaymentStatus.FAILED, PaymentStatus.DECLINED]

    def is_refunded(self):
        """Check if payment was refunded"""
        return self.status == PaymentStatus.REFUNDED

    def can_be_refunded(self):
        """Check if payment can be refunded"""
        return self.status == PaymentStatus.COMPLETED