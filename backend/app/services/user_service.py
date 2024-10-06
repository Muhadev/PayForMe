import logging
from app.models import User
from app import db
from app.utils.validators import validate_email

logger = logging.getLogger(__name__)

class UserService:
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

        updatable_fields = ['email', 'full_name', 'bio', 'preferences']
        
        for field in updatable_fields:
            if field in data:
                if field == 'email':
                    if not validate_email(data['email']):
                        logger.warning(f"Profile update failed: Invalid email format for user {user.username}")
                        return False, "Invalid email format"
                elif field == 'preferences':
                    user.update_preferences(data['preferences'])
                    continue
                setattr(user, field, data[field])

        try:
            db.session.commit()
            logger.info(f"User {user.username} updated their profile successfully")
            return True, "Profile updated successfully"
        except Exception as e:
            db.session.rollback()
            logger.error(f"Database error while updating profile for user {user.username}: {str(e)}")
            return False, "An error occurred while updating the profile"

    @staticmethod
    def get_user_public_profile(user_id):
        user = User.query.get(user_id)
        if user:
            return user.to_dict(include_private=False)
        logger.warning(f"Public profile not found for user ID {user_id}")
        return None

    @staticmethod
    def get_user_private_profile(user_id):
        user = User.query.get(user_id)
        if user:
            return user.to_dict(include_private=True)
        logger.warning(f"Private profile not found for user ID {user_id}")
        return None