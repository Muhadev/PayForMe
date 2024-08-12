from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Enum
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm import relationship
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, DecodeError
from app import db
from time import time
import jwt
from enum import Enum as PyEnum
from flask import current_app
from datetime import datetime

class UserRole(PyEnum):
    USER = 'user'
    ADMIN = 'admin'

class User(db.Model):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    bio = Column(Text)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    is_active = Column(Boolean, default=True)
    preferences = Column(JSON)
    failed_login_attempts = Column(Integer, default=0)
    last_password_change = Column(DateTime, default=datetime.utcnow)

    projects_created = relationship("Project", back_populates="creator", cascade="all, delete-orphan")
    donations = relationship("Donation", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    backed_projects = relationship("Project", secondary="project_backers", back_populates="backers", cascade="save-update")

    # Add these fields to the User model
    stripe_customer_id = Column(String(100), unique=True)
    is_verified = Column(Boolean, default=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    last_login = Column(DateTime)
    
    # Add this relationship
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")

    
    # Add these relationships
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", foreign_keys="[Message.sender_id]", cascade="all, delete-orphan")
    received_messages = relationship("Message", foreign_keys="[Message.recipient_id]", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def increment_failed_login_attempts(self):
        self.failed_login_attempts += 1
        db.session.commit()

    def reset_failed_login_attempts(self):
        self.failed_login_attempts = 0
        db.session.commit()

    def soft_delete(self):
        self.is_active = False
        db.session.commit()

    def reactivate(self):
        self.is_active = True
        db.session.commit()

    def update_preferences(self, new_preferences):
        if self.preferences is None:
            self.preferences = {}
        self.preferences.update(new_preferences)
        db.session.commit()

    def get_verification_token(self, expires_in=3600):
        try:
            return jwt.encode(
                {'verify_email': self.id, 'exp': time() + expires_in},
                current_app.config['SECRET_KEY'], algorithm='HS256')
        except Exception as e:
            current_app.logger.error(f"Error generating verification token: {str(e)}")
            return None

    def get_reset_password_token(self, expires_in=600):
        try:
            return jwt.encode(
                {'reset_password': self.id, 'exp': time() + expires_in},
                current_app.config['SECRET_KEY'], algorithm='HS256')
        except Exception as e:
            current_app.logger.error(f"Error generating reset password token: {str(e)}")
            return None

    @staticmethod
    def verify_verification_token(token):
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'],
                              algorithms=['HS256'])
            id = data['verify_email']
        except ExpiredSignatureError:
            current_app.logger.warning("Expired verification token")
            return None
        except (InvalidTokenError, DecodeError, KeyError) as e:
            current_app.logger.error(f"Invalid verification token: {str(e)}")
            return None
        return User.query.get(id)

    @staticmethod
    def verify_reset_password_token(token):
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'],
                              algorithms=['HS256'])
            id = data['reset_password']
        except ExpiredSignatureError:
            current_app.logger.warning("Expired reset password token")
            return None
        except (InvalidTokenError, DecodeError, KeyError) as e:
            current_app.logger.error(f"Invalid reset password token: {str(e)}")
            return None
        return User.query.get(id)

    def __repr__(self):
        return f'<User {self.username}>'