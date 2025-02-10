from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.user_service import UserService  # Update this import
from app.utils.response import api_response
from app.utils.decorators import permission_required
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create a Blueprint for the profile routes
profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    
    logger.debug(f"JWT Identity returned: {current_user_id} (type: {type(current_user_id)})")
    
    user_profile = UserService.get_user_private_profile(current_user_id)
    
    if user_profile:
        logger.info(f"User profile retrieved for user ID {current_user_id}")
        return api_response(
            data={'user': user_profile},
            message="User profile retrieved successfully",
            status_code=200
        )
    else:
        logger.warning(f"Profile retrieval failed: User not found for ID {current_user_id}")
        return api_response(
            message="User not found",
            status_code=404
        )

@profile_bp.route('/', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()

    # Get JSON data
    data = request.form.to_dict()

    # Validate input size/type
    if request.content_length and request.content_length > 10 * 1024 * 1024:  # 10MB limit
        return api_response(
            message="File too large. Maximum 10MB allowed.",
            status_code=413
        )
    
    # Check if request contains file
    profile_image = None
    if 'profile_image' in request.files:
        profile_image = request.files['profile_image']

    if not data and not profile_image:
        logger.warning(f"Update profile attempt with missing data for user {current_user_id}")
        return api_response(
            message="No data provided",
            status_code=400
        )

    success, message = UserService.update_user_profile(
        current_user_id, 
        data, 
        profile_image
    )

    if success:
        logger.info(f"User {current_user_id} updated their profile")
        return api_response(
            message=message,
            status_code=200
        )
    else:
        logger.warning(f"Failed profile update for user {current_user_id}: {message}")
        return api_response(
            message=message,
            status_code=400
        )

@profile_bp.route('/<int:user_id>', methods=['GET'])
@permission_required('view_public_profile')  # Restrict access to users with the 'view_public_profile' permission
def get_public_profile(user_id):
    user_profile = UserService.get_user_public_profile(user_id)
    if user_profile:
        logger.info(f"Public profile retrieved for user ID {user_id}")
        return api_response(
            data={'user': user_profile},
            message="User public profile retrieved successfully",
            status_code=200
        )
    else:
        logger.warning(f"Public profile retrieval failed: User not found for ID {user_id}")
        return api_response(
            message="User not found",
            status_code=404
        )

@profile_bp.route('/', methods=['DELETE'])
@jwt_required()
def delete_account():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user.soft_delete()  # Or implement hard delete based on your requirements
    return api_response(message="Account deleted successfully", status_code=200)