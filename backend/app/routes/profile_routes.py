from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.auth_service import AuthService
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create a Blueprint for the profile routes
profile_bp = Blueprint('profile', __name__, url_prefix='/profile')

@profile_bp.route('/get_profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    user = AuthService.get_user_profile(current_user_id)
    if user:
        logger.info(f"User profile retrieved for user {user.username}")
        return jsonify({'user': user}), 200
    else:
        logger.warning(f"Profile retrieval failed: User not found for ID {current_user_id}")
        return jsonify({"msg": "User not found"}), 404

@profile_bp.route('/update_profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        logger.warning(f"Update profile attempt with missing data for user {current_user_id}")
        return jsonify({"msg": "No data provided"}), 400

    success, message = AuthService.update_user_profile(current_user_id, data)

    if success:
        logger.info(f"User {current_user_id} updated their profile")
        return jsonify({"msg": message}), 200
    else:
        logger.warning(f"Failed profile update for user {current_user_id}")
        return jsonify({"msg": message}), 400
