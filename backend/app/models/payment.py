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

    id = Column(Integer, primary_key=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)  # e.g., 'USD', 'EUR'
    status = Column(Enum(PaymentStatus), nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    transaction_id = Column(String(100), unique=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    donation_id = Column(Integer, ForeignKey('donations.id'), nullable=False)

    user = relationship("User", back_populates="payments")
    donation = relationship("Donation", back_populates="payment")

    def __repr__(self):
        return f'<Payment {self.id} - {self.amount} {self.currency}>'