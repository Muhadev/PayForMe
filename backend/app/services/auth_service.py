from datetime import datetime, timedelta
import uuid
from flask import current_app
from werkzeug.security import generate_password_hash
from app import db
from app.models import User, TokenBlocklist, Role
from app.services.email_service import send_templated_email
from app.utils.validators import validate_password, validate_email
from flask_jwt_extended import create_access_token
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def register_user(username, email, password, full_name=None):
        """
        Enhanced user registration service with proper error handling
        """
        try:
            # Validate user doesn't exist first
            if User.query.filter_by(username=username).first():
                logger.warning(f"Registration failed: Username {username} already exists")
                return False, "Username already exists"

            if User.query.filter_by(email=email).first():
                logger.warning(f"Registration failed: Email {email} already exists")
                return False, "Email already exists"

            # Validate input
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
                created_at=datetime.utcnow()
            )
            new_user.set_password(password)

            # Step 2: Add the user to the session to generate the ID
            db.session.add(new_user)
            db.session.flush()  # Ensure that the ID is generated

            logger.debug(f"Generated user ID: {new_user.id}")
            
            # Assign the "User" role by default
            user_role = Role.query.filter_by(name="User").first()
            if user_role:
                new_user.roles.append(user_role)

            # Step 3: Generate the verification token using the now-available new_user.id
            verification_token = new_user.generate_verification_token()
            try:
                # Attempt to send verification email
                send_templated_email(
                    new_user.email,
                    'verify_email',
                    user=new_user,
                    token=verification_token
                )

                # If email sends successfully, commit the transaction
                db.session.commit()
                logger.info(f"User {username} registered successfully")
                return True, "User created successfully. Please check your email to verify your account."

            except EmailServiceError as e:
                # If email fails, roll back and return appropriate error
                db.session.rollback()
                logger.error(f"Registration failed: Email service error for {email} - {str(e)}")
                return False, "Registration successful but verification email could not be sent. Please contact support."
        
        except Exception as e:
            db.session.rollback()
            logger.error(f"Registration failed: Unexpected error - {str(e)}")
            return False, "An unexpected error occurred during registration. Please try again."

    @staticmethod
    def verify_email(token):
        user = User.verify_verification_token(token)
        if user and user.verification_token == token:  # Check that the tokens match
            if user.is_verified:
                logger.info(f"Email verification attempt for already verified user: {user.username}")
                return False, "Email is already verified"
            
            # Mark the user as verified
            user.is_verified = True
            user.verification_token = None  # Clear the token after verification
            db.session.commit()
            
            logger.info(f"Email verified successfully for user {user.username}")
            return True, "Email verified successfully"

        logger.warning(f"Invalid or expired verification token: {token}")
        return False, "Invalid or expired verification token"

    @staticmethod
    def login_user(email, password):
        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            if not user.is_verified:
                logger.warning(f"Unverified login attempt for user: {email}")
                return False, "Please verify your email before logging in"
            
            if not user.is_active:
                logger.warning(f"Login attempt for deactivated account: {email}")
                return False, "This account has been deactivated"

            if user.failed_login_attempts >= 5:
                logger.warning(f"Account locked due to too many failed attempts: {email}")
                return False, "Account locked. Please reset your password."

            user.last_login = datetime.utcnow()
            user.failed_login_attempts = 0
            db.session.commit()
            logger.info(f"User {email} logged in successfully")
            return True, user.id
        
        if user:
            user.increment_failed_login_attempts()
        logger.warning(f"Failed login attempt for email: {email}")
        return False, "Invalid email or password"

    @staticmethod
    def create_token_for_user(user):
        roles = [role.name for role in user.roles]
        permissions = set()
        for role in user.roles:
            for perm in role.permissions:
                permissions.add(perm.name)
        
        # Add basic permissions that all authenticated users should have
        basic_permissions = {'view_categories'}
        permissions.update(basic_permissions)
        additional_claims = {
            "roles": roles,
            "permissions": list(permissions),
            'last_permission_update': user.last_permission_update.timestamp() if user.last_permission_update else time.time()
        }

        access_token = create_access_token(identity=user.id, additional_claims=additional_claims)
        return access_token

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
            reset_token = user.get_reset_password_token()  # Generate the token
            reset_link = f"{current_app.config['FRONTEND_URL']}/password-reset/{reset_token}"
            send_templated_email(user.email, 'reset_password', user=user, reset_link=reset_link)
            logger.info(f"Password reset initiated for user: {user.email}")
        return True, "If an account with this email exists, a password reset link has been sent"


    @staticmethod
    def reset_password(token, new_password):
        user = User.verify_reset_password_token(token)
        if user:
            if not validate_password(new_password):
                logger.warning(f"Password reset failed: New password does not meet requirements for user {user.username}")
                return False, "Password does not meet requirements"
            user.set_password(new_password)
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
    def change_user_password(user_id, current_password, new_password):
        user = User.query.get(user_id)
        
        if not user:
            logger.error(f"User not found for ID: {user_id}")
            return {"message": "User not found", "status_code": 404}
        
        if not user.check_password(current_password):
            logger.warning(f"Invalid current password attempt for user ID: {user_id}")
            return {"message": "Current password is incorrect", "status_code": 400}

        # Validate new password security
        if not validate_password(new_password):
            logger.warning(f"Password change failed: Weak new password for user ID {user_id}")
            return {"message": "New password does not meet security requirements", "status_code": 400}

        user.set_password(new_password)
        
        try:
            db.session.commit()
            logger.info(f"Password successfully changed for user {user.username}")

            # Revoke all JWT tokens
            db.session.add(TokenBlocklist(jti=str(uuid.uuid4()), created_at=datetime.utcnow()))
            db.session.commit()
            
            return {"message": "Password changed successfully", "status_code": 200}

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error changing password for user {user.username}: {str(e)}")
            return {"message": "Server error occurred", "status_code": 500}
