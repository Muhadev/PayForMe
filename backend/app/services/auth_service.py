from datetime import datetime, timedelta
import uuid
from werkzeug.security import generate_password_hash
from app import db
from app.models import User, TokenBlocklist
from app.services.email_service import send_templated_email
from app.utils.validators import validate_password, validate_email
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def register_user(username, email, password, full_name=None):
        if User.query.filter_by(username=username).first():
            logger.warning(f"Registration failed: Username {username} already exists")
            return False, "Username already exists"
        if User.query.filter_by(email=email).first():
            logger.warning(f"Registration failed: Email {email} already exists")
            return False, "Email already exists"

        if not validate_email(email):
            logger.warning(f"Registration failed: Invalid email format for {email}")
            return False, "Invalid email format"
        if not validate_password(password):
            logger.warning(f"Registration failed: Password does not meet requirements for user {username}")
            return False, "Password does not meet requirements"

        new_user = User(
            username=username,
            email=email,
            full_name=full_name,
            created_at=datetime.utcnow(),
            verification_token=str(uuid.uuid4())
        )
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        send_templated_email(new_user.email, 'verification', new_user)
        logger.info(f"User {username} registered successfully")

        return True, "User created successfully. Please check your email to verify your account."

    @staticmethod
    def verify_email(token):
        user = User.query.filter_by(verification_token=token).first()
        if user:
            user.is_verified = True
            user.verification_token = None
            db.session.commit()
            logger.info(f"Email verified successfully for user {user.username}")
            return True, "Email verified successfully"
        logger.warning(f"Invalid verification token: {token}")    
        return False, "Invalid verification token"

    @staticmethod
    def login_user(username, password):
        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            if not user.is_verified:
                logger.warning(f"Unverified login attempt for user: {username}")
                return False, "Please verify your email before logging in"
            
            if not user.is_active:
                logger.warning(f"Login attempt for deactivated account: {username}")
                return False, "This account has been deactivated"

            if user.failed_login_attempts >= 5:
                logger.warning(f"Account locked due to too many failed attempts: {username}")
                return False, "Account locked. Please reset your password."

            user.last_login = datetime.utcnow()
            user.failed_login_attempts = 0
            db.session.commit()
            logger.info(f"User {username} logged in successfully")
            return True, user.id
        
        if user:
            user.increment_failed_login_attempts()
        logger.warning(f"Failed login attempt for username: {username}")
        return False, "Invalid username or password"

    @staticmethod
    def deactivate_user(user_id):
        user = User.query.get(user_id)
        if user:
            user.soft_delete()
            logger.info(f"User {user.username} deactivated their account")
            return True, "Account deactivated successfully"
        return False, "User not found"

    @staticmethod
    def reactivate_user(username, password):
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            user.reactivate()
            logger.info(f"User {username} reactivated their account")
            return True, "Account reactivated successfully"
        return False, "Invalid username or password"

    @staticmethod
    def update_user_preferences(user_id, preferences):
        user = User.query.get(user_id)
        if user:
            user.update_preferences(preferences)
            logger.info(f"Preferences updated for user {user.username}")
            return True, "Preferences updated successfully"
        return False, "User not found"

    @staticmethod
    def logout_user(jti):
        now = datetime.utcnow()
        db.session.add(TokenBlocklist(jti=jti, created_at=now))
        db.session.commit()
        logger.info(f"JWT revoked with jti: {jti}")
        return True, "JWT revoked"

    @staticmethod
    def initiate_password_reset(email):
        user = User.query.filter_by(email=email).first()
        if user:
            reset_token = str(uuid.uuid4())
            user.reset_token = reset_token
            user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
            db.session.commit()
            send_templated_email(user.email, 'reset_password', user)
            logger.info(f"Password reset initiated for user: {user.username}")
        return True, "If an account with this email exists, a password reset link has been sent"

    @staticmethod
    def reset_password(token, new_password):
        user = User.query.filter_by(reset_token=token).first()
        if user and user.reset_token_expires > datetime.utcnow():
            if not validate_password(new_password):
                logger.warning(f"Password reset failed: New password does not meet requirements for user {user.username}")
                return False, "Password does not meet requirements"
            user.set_password(new_password)
            user.reset_token = None
            user.reset_token_expires = None
            db.session.commit()
            logger.info(f"Password reset successfully for user {user.username}")
            return True, "Password reset successfully"
        logger.warning(f"Invalid or expired reset token: {token}")
        return False, "Invalid or expired reset token"

    @staticmethod
    def check_if_token_revoked(jti):
        token = db.session.query(TokenBlocklist.id).filter_by(jti=jti).scalar()
        logger.info(f"Token with jti: {jti} is revoked")
        return token is not None

    @staticmethod
    def get_user_profile(user_id):
        user = User.query.get(user_id)
        if user:
            return user
        logger.warning(f"User profile not found for user ID {user_id}")
        return None

    @staticmethod
    def update_user_profile(user_id, data):
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User not found for user ID {user_id}")
            return False, "User not found"

        if 'email' in data:
            if not validate_email(data['email']):
                logger.warning(f"Profile update failed: Invalid email format for user {user.username}")
                return False, "Invalid email format"
            user.email = data['email']

        if 'full_name' in data:
            user.full_name = data['full_name']

        db.session.commit()
        logger.info(f"User {user.username} updated their profile successfully")
        return True, "Profile updated successfully"
