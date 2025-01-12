from enum import Enum
import logging

logger = logging.getLogger(__name__)

class ProjectStatus(Enum):
    DRAFT = 'DRAFT'
    PENDING = 'PENDING'
    ACTIVE = 'ACTIVE'
    FUNDED = 'FUNDED'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

    @classmethod
    def _missing_(cls, value):
        value = str(value).upper()
        for member in cls:
            if member.value == value:
                return member
        return None

    @classmethod
    def from_string(cls, value):
        try:
            return cls[value.upper()] if value else cls.DRAFT
        except KeyError:
            logger.warning(f"Invalid status value: {value}. Defaulting to DRAFT.")
            return cls.DRAFT

    def __str__(self):
        return self.value


class DonationStatus(Enum):
    PENDING = 'PENDING'
    COMPLETED = 'COMPLETED'
    REFUNDED = 'REFUNDED'
    FAILED = 'FAILED'

    @classmethod
    def from_string(cls, value):
        return cls._from_str(value, default=cls.PENDING)


class PaymentStatus(Enum):
    PENDING = 'PENDING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    REFUNDED = 'REFUNDED'
    PROCESSING = 'PROCESSING'
    CANCELLED = 'CANCELLED'
    DECLINED = 'DECLINED'
    DISPUTED = 'DISPUTED'

    @classmethod
    def from_string(cls, value):
        return cls._from_str(value, default=cls.PENDING)

    @classmethod
    def _from_str(cls, value, default=None):
        """Centralized method for handling string input for enums"""
        value = str(value).upper()
        return cls[value] if value in cls.__members__ else default


class PaymentMethod(Enum):
    CREDIT_CARD = 'CREDIT_CARD'
    DEBIT_CARD = 'DEBIT_CARD'
    PAYPAL = 'PAYPAL'
    BANK_TRANSFER = 'BANK_TRANSFER'
    CRYPTO = 'CRYPTO'
    MOBILE_PAYMENT = 'MOBILE_PAYMENT'
    WALLET = 'WALLET'

    @classmethod
    def from_string(cls, value):
        return cls._from_str(value, default=cls.CREDIT_CARD)

class NotificationType(Enum):
    PROJECT_UPDATE = 'PROJECT_UPDATE'
    NEW_BACKER = 'NEW_BACKER'
    FUNDING_GOAL_REACHED = 'FUNDING_GOAL_REACHED'
    COMMENT_RECEIVED = 'COMMENT_RECEIVED'
    REWARD_SHIPPED = 'REWARD_SHIPPED'
    ADMIN_REVIEW = 'ADMIN_REVIEW'  # Add your new type here
    USER_UPDATE = 'USER_UPDATE'
    SYSTEM = 'SYSTEM'


class PaymentProvider(Enum):
    STRIPE = 'STRIPE'
    PAYPAL = 'PAYPAL'
    SQUARE = 'SQUARE'
    RAZORPAY = 'RAZORPAY'
    FLUTTERWAVE = 'FLUTTERWAVE'

    @classmethod
    def from_string(cls, value):
        return cls._from_str(value, default=cls.STRIPE)
