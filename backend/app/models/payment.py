# app/models/payment.py

from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app import db
from sqlalchemy.sql import func
from .enums import PaymentStatus, PaymentMethod, PaymentProvider
from app.config.stripe_config import StripeConfig
from datetime import datetime
from sqlalchemy import UniqueConstraint

class Payment(db.Model):
    __tablename__ = 'payments'

    id = Column(Integer, primary_key=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)  # e.g., 'USD', 'EUR'
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    method = Column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.CREDIT_CARD)
    provider = Column(Enum(PaymentProvider), nullable=False, default=PaymentProvider.STRIPE)
    transaction_id = Column(String(100), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    error_message = Column(String(500))
    payment_metadata = Column(db.JSON)

    idempotency_key = db.Column(db.String(64), nullable=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'donation_id', 'amount', 'idempotency_key', name='uq_payment_idempotency'),
    )
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    donation_id = Column(Integer, ForeignKey('donations.id'), nullable=False)
    updated_by = Column(Integer, ForeignKey('users.id'))  # Define this before using in relationship

    user = relationship('User', foreign_keys=[user_id], back_populates='payments')
    # Use a unique backref name to avoid conflicts
    updated_user = relationship('User', foreign_keys=[updated_by], backref='payments_updated_by_user', overlaps="updated_payments,updater")
    donation = relationship("Donation", back_populates="payment")

    ip_country = Column(String(2))  # Country code for fraud detection

    ip_address = Column(String(45))  # Store IP for fraud detection
    billing_address = Column(db.JSON)    # Store billing details
    fee_amount = Column(Float)        # Platform/processing fee
    net_amount = Column(Float)        # Amount after fees
    refund_reason = Column(String(200))

    __table_args__ = (
        db.Index('idx_user_id', 'user_id'),
        db.Index('idx_donation_id', 'donation_id'),
        db.Index('idx_status_created_at', 'status', 'created_at'),
    )
    
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
