from enum import Enum

class ProjectStatus(Enum):
    DRAFT = 'DRAFT'
    PENDING = 'PENDING'
    ACTIVE = 'ACTIVE'
    FUNDED = 'FUNDED'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            value = value.upper()
        for member in cls:
            if member.value == value:
                return member
        return None

    @classmethod
    def from_string(cls, value):
        if value is None:
            return cls.DRAFT
        try:
            return cls[value.upper()]
        except ValueError:
            logger.warning(f"Invalid status value: {value}. Defaulting to DRAFT.")
            return cls.DRAFT

    def __str__(self):
        return self.value

    def __eq__(self, other):
        if isinstance(other, str):
            return self.value.lower() == other.lower()
        return super().__eq__(other)

    def __hash__(self):
        return hash(self.value)

class DonationStatus(Enum):
    PENDING = 'PENDING'
    COMPLETED = 'COMPLETED'
    REFUNDED = 'REFUNDED'
    FAILED = 'FAILED'

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            value = value.upper()
        for member in cls:
            if member.value == value:
                return member
        return None

    @classmethod
    def from_string(cls, value):
        if value is None:
            return cls.PENDING
        try:
            return cls[value.upper()]
        except ValueError:
            logger.warning(f"Invalid donation status value: {value}. Defaulting to PENDING.")
            return cls.PENDING

    def __str__(self):
        return self.value

    def __eq__(self, other):
        if isinstance(other, str):
            return self.value.lower() == other.lower()
        return super().__eq__(other)

    def __hash__(self):
        return hash(self.value)