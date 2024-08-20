import logging
from app.models import User
from app import db
from app.utils.validation import validate_email

# Configure logging
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

