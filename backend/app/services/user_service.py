import logging
from typing import Tuple, Optional, Dict, Any
from sqlalchemy.exc import SQLAlchemyError
from app.models import User
from app import db
from werkzeug.datastructures import FileStorage
from app.utils.validators import validate_email
from flask import current_app
import os
import uuid
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    def get_user_profile(user_id: int) -> Optional[User]:
        """
        Get complete user object.
        
        Args:
            user_id: The ID of the user to retrieve
            
        Returns:
            User object if found, None otherwise
        """
        try:
            user = User.query.filter_by(id=user_id).first()
            if not user:
                logger.warning(f"User profile not found for user ID {user_id}")
                return None
            return user
        except SQLAlchemyError as e:
            logger.error(f"Database error retrieving user {user_id}: {str(e)}")
            return None

    @staticmethod
    def update_user_profile(user_id: int, data: Dict[str, Any], profile_image: Optional[FileStorage] = None) -> Tuple[bool, str]:
        """
        Update user profile with provided data and optional profile image.
        
        Args:
            user_id: The ID of the user to update
            data: Dictionary containing fields to update
            profile_image: Optional uploaded image file
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            print(f"Received user_id: {user_id}")

            user = User.query.filter_by(id=user_id).first()
            if not user:
                logger.warning(f"User not found for user ID {user_id}")
                return False, "User not found"

            # Existing field validations
            updatable_fields = {
                'email': lambda x: validate_email(x),
                'full_name': lambda x: isinstance(x, str) and len(x.strip()) > 0,
                'bio': lambda x: isinstance(x, str),
                'location': lambda x: isinstance(x, str),
                'website': lambda x: isinstance(x, str),
                'twitter': lambda x: isinstance(x, str),
                'preferences': lambda x: isinstance(x, dict)
            }
            
            for field, validator in updatable_fields.items():
                if field in data:
                    value = data[field]
                    
                    # Validate field value
                    if not validator(value):
                        logger.warning(f"Invalid {field} format for user {user.username}")
                        return False, f"Invalid {field} format"
                    
                    # Handle special cases
                    if field == 'preferences':
                        user.update_preferences(value)
                    else:
                        setattr(user, field, value)

            # Handle profile image upload
            if profile_image:
                # Validate image
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
                filename = secure_filename(profile_image.filename)
                file_ext = filename.rsplit('.', 1)[1].lower()
                
                if file_ext not in allowed_extensions:
                    return False, "Invalid image type. Allowed types: png, jpg, jpeg, gif"
                
                # Generate unique filename
                unique_filename = f"{user.id}_{str(uuid.uuid4())}.{file_ext}"
                filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
                
                # Save file
                profile_image.save(filepath)
                
                # Update user's profile image path
                user.profile_image = unique_filename

            db.session.commit()
            logger.info(f"User {user.username} profile updated successfully")
            return True, "Profile updated successfully"
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error updating profile: {str(e)}")
            return False, "Database error occurred while updating profile"
        except Exception as e:
            db.session.rollback()
            logger.error(f"Unexpected error updating profile: {str(e)}")
            return False, "An unexpected error occurred"

    @staticmethod
    def get_user_public_profile(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get public profile data for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            Dictionary of public profile data if found, None otherwise
        """
        try:
            user = User.query.filter_by(id=user_id).first()
            if not user:
                logger.warning(f"Public profile not found for user ID {user_id}")
                return None
            return user.to_dict(include_private=False)
        except Exception as e:
            logger.error(f"Error retrieving public profile for user {user_id}: {str(e)}")
            return None

    @staticmethod
    def get_user_private_profile(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get private profile data for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            Dictionary of private profile data if found, None otherwise
        """
        try:
            user = User.query.filter_by(id=user_id).first()
            if not user:
                logger.warning(f"Private profile not found for user ID {user_id}")
                return None
            
            profile_data = user.to_dict(include_private=True)
            
            # Handle potentially missing attributes gracefully
            optional_fields = ['stripe_customer_id']
            for field in optional_fields:
                if field not in profile_data:
                    profile_data[field] = None
                    
            return profile_data
            
        except AttributeError as e:
            logger.error(f"Attribute error retrieving private profile for user {user_id}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving private profile for user {user_id}: {str(e)}")
            return None