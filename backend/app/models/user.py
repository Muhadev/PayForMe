from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Enum
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm import relationship
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, DecodeError
from app import db
from time import time
import jwt
from enum import Enum as PyEnum
from flask import url_for
from flask import current_app
from datetime import datetime
from app.models.association_tables import user_roles  # Import the association table
import pyotp

# class UserRole(PyEnum):
#     USER = 'user'
#     ADMIN = 'admin'

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100))
    bio = db.Column(db.Text)
    website = db.Column(db.String(255), nullable=True)
    twitter = db.Column(db.String(255), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    profile_image = db.Column(db.String(255), nullable=True)

    is_active = db.Column(db.Boolean, default=True)
    preferences = db.Column(db.JSON)
    failed_login_attempts = db.Column(db.Integer, default=0)
    last_password_change = db.Column(db.DateTime, default=datetime.utcnow)

    projects_created = db.relationship("Project", back_populates="creator", cascade="all, delete-orphan")
    donations = db.relationship("Donation", back_populates="user", cascade="all, delete-orphan")
    comments = db.relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    backed_projects = db.relationship("Project", secondary="project_backers", back_populates="backers", cascade="save-update")
    roles = db.relationship('Role', secondary='user_roles', back_populates='users')
    
    # Add these fields to the User model
    is_verified = db.Column(db.Boolean, default=False)
    # role = db.Column(db.Enum(UserRole), default=UserRole.USER)
    last_login = db.Column(db.DateTime)
    
    # Add these relationships
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sent_messages = db.relationship("Message", foreign_keys='Message.sender_id', back_populates="sender")
    received_messages = db.relationship("Message", foreign_keys='Message.receiver_id', back_populates="receiver")

    # Add verification_token column
    verification_token = db.Column(db.String(256), unique=True)

    # 2FA-specific fields
    two_factor_secret = db.Column(db.String(32))
    two_factor_enabled = db.Column(db.Boolean, default=False)
    two_factor_setup_code = db.Column(db.String(6))  # For temporary storage during setup

    last_permission_update = db.Column(db.DateTime, default=datetime.utcnow)

    stripe_customer_id = db.Column(db.String(255), unique=True, nullable=True)
    
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

    def get_total_donations(self):
        return sum(donation.amount for donation in self.donations)

    def update_last_login(self):
        self.last_login = datetime.utcnow()
        db.session.commit()

    def is_account_locked(self):
        return self.failed_login_attempts >= current_app.config['MAX_LOGIN_ATTEMPTS']

    def enable_2fa(self):
        self.two_factor_secret = pyotp.random_base32()
        self.two_factor_enabled = True

    def disable_2fa(self):
        self.two_factor_secret = None
        self.two_factor_enabled = False

    def verify_2fa(self, token):
        if not self.two_factor_enabled or not self.two_factor_secret:
            return False
        totp = pyotp.TOTP(self.two_factor_secret)
        return totp.verify(token)

    def get_2fa_uri(self):
        if not self.two_factor_secret:
            return None
        totp = pyotp.TOTP(self.two_factor_secret)
        return totp.provisioning_uri(name=self.email, issuer_name="PayForMe")

    def generate_verification_token(self, expires_in=600):
        token = jwt.encode(
            {'verify_email': self.id, 'exp': time() + expires_in},
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        self.verification_token = token
        # db.session.commit()
        return token

    def get_reset_password_token(self, expires_in=600):
        try:
            token = jwt.encode(
                {'reset_password': self.id, 'exp': time() + expires_in},
                current_app.config['SECRET_KEY'], 
                algorithm='HS256'
            )
            current_app.logger.info(f"Generated reset token: {token}")
            return token
        except Exception as e:
            current_app.logger.error(f"Error generating reset password token: {str(e)}")
            return None


    @staticmethod
    def verify_verification_token(token):
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = data.get('verify_email')
            if user_id:
                return User.query.get(user_id)
        except ExpiredSignatureError:
            current_app.logger.warning("Expired verification token")
        except (InvalidTokenError, DecodeError, KeyError) as e:
            current_app.logger.error(f"Invalid verification token: {str(e)}")
        return None

    @staticmethod
    def verify_reset_password_token(token):
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = data['reset_password']
            return User.query.get(user_id)
        except ExpiredSignatureError:
            current_app.logger.warning("Expired reset password token")
        except (InvalidTokenError, DecodeError, KeyError) as e:
            current_app.logger.error(f"Invalid reset password token: {str(e)}")
        return None

    # Method to get full URL of profile image
    def get_profile_image_url(self):
        if not self.profile_image:
            return None
        return url_for('static', filename=f'uploads/profiles/{self.profile_image}', _external=True)

    def to_dict(self, include_private=False):
        base_dict = {
            'id': self.id,
            'username': self.username,
            'full_name': self.full_name,
            'bio': self.bio,
            'profile_image': self.get_profile_image_url(),
            'website': self.website,
            'twitter': self.twitter,
            'location': self.location,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'roles': [role.name for role in self.roles],  # List of role names
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'projects_created_count': len(self.projects_created),
            'backed_projects_count': len(self.backed_projects),
            'total_donations': self.get_total_donations(),
            'two_factor_enabled': self.two_factor_enabled,
        }

        # Private fields only included when specifically requested
        if include_private:
            private_dict = {
                'email': self.email,
                'preferences': self.preferences or {},
                'stripe_customer_id': getattr(self, 'stripe_customer_id', None),
                'last_password_change': self.last_password_change.isoformat() if self.last_password_change else None
            }
            base_dict.update(private_dict)

        return base_dict