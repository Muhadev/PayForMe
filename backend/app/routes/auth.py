from flask import Blueprint, jsonify, request, current_app, url_for, redirect
from flask_jwt_extended import create_access_token, decode_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.models import User
from app import jwt, limiter
from app.services.auth_service import AuthService
from app.utils.response import api_response
from flask_limiter.util import get_remote_address
import logging

# Configure logging
logger = logging.getLogger(__name__)
# Initialize Limiter

bp = Blueprint('auth', __name__)

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return AuthService.check_if_token_revoked(jti)

@bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    """
    Verify email endpoint with frontend redirection.
    """
    success, message = AuthService.verify_email(token)
    
    # Construct frontend URL for success or failure
    status = "success" if success else "error"
    frontend_url = f"{current_app.config['FRONTEND_URL']}/verify-email?status={status}&message={message}"
    
    return redirect(frontend_url)

@bp.route('/register', methods=['POST'])
def register():
    """
    Synchronous registration endpoint with proper error handling
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"msg": "No input data provided"}), 400

        required_fields = ["username", "email", "password"]
        if not all(field in data for field in required_fields):
            return jsonify({"msg": "Missing required fields"}), 400

        success, message = AuthService.register_user(
            data['username'],
            data['email'],
            data['password'],
            data.get('full_name')
        )

        if success:
            return jsonify({"msg": message}), 201
        return jsonify({"msg": message}), 400

    except Exception as e:
        logger.error(f"Registration endpoint error: {str(e)}")
        return jsonify({"msg": "Server error occurred"}), 500

@bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")  # Custom rate limit for login
def login():
    data = request.get_json()

    if not all(k in data for k in ("email", "password")):
        logger.warning("Login attempt with missing email or password")
        return jsonify({"msg": "Missing email or password"}), 400

    success, result = AuthService.login_user(data['email'], data['password'])

    if success:
        logger.info(f"User {data['email']} logged in successfully")
        
        # Fetch the user object and generate a token with roles and permissions
        user = User.query.get(result)  # Assuming result is the user ID

        logger.info(f"User roles at login: {[role.name for role in user.roles]}")

        access_token = AuthService.create_token_for_user(user)
        refresh_token = create_refresh_token(identity=result)

        # Decode and log the token for verification
        
        decoded = decode_token(access_token)
        logger.info(f"Generated token roles: {decoded.get('roles')}")

        return jsonify({
            "msg": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200
    else:
        logger.warning(f"Failed login attempt for email: {data['email']}")
        return jsonify({"msg": result}), 401

@bp.route('/deactivate', methods=['POST'])
@jwt_required()
def deactivate_account():
    current_user_id = get_jwt_identity()
    success, message = AuthService.deactivate_user(current_user_id)
    if success:
        logger.info(f"User {current_user_id} deactivated their account")
        return jsonify({"msg": message}), 200
    else:
        logger.warning(f"Failed to deactivate account for user {current_user_id}")
        return jsonify({"msg": message}), 400

@bp.route('/reactivate', methods=['POST'])
@limiter.limit("5 per minute", key_func=get_remote_address)
def reactivate_account():
    data = request.get_json()
    success, message = AuthService.reactivate_user(data['username'], data['password'])
    if success:
        logger.info(f"User {data['username']} reactivated their account")
        return jsonify({"msg": message}), 200
    else:
        logger.warning(f"Failed to reactivate account for user {data['username']}")
        return jsonify({"msg": message}), 400

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user)
        current_app.logger.info(f"Refreshed access token for user: {current_user}")
        return jsonify(access_token=new_access_token), 200
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({"msg": "Invalid refresh token"}), 401

@bp.route('/logout', methods=['DELETE'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    success, message = AuthService.logout_user(jti)
    logger.info(f"User logged out and JWT revoked with jti: {jti}")
    return jsonify(msg=message), 200

@bp.route('/password-reset-request', methods=['POST'])
@limiter.limit("5 per minute", key_func=get_remote_address)
def password_reset_request():
    data = request.get_json()
    success, message = AuthService.initiate_password_reset(data['email'])
    logger.info(f"Password reset request initiated for email: {data['email']}")
    return api_response(message=message, status_code=200)

@bp.route('/password-reset/<token>', methods=['POST'])
def password_reset(token):
    data = request.get_json()
    success, message = AuthService.reset_password(token, data['password'])
    if success:
        logger.info(f"Password reset successful for token: {token}")
        return api_response(message=message, status_code=200)
    else:
        logger.warning(f"Failed password reset attempt with token: {token}")
        return api_response(message=message, status_code=400)

@bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    try:
        current_user_id = get_jwt_identity()
        user = AuthService.get_user_profile(current_user_id)
        logger.info(f"Protected resource accessed by user: {user.username}")
        return jsonify(logged_in_as=user.username), 200
    except JWTException as e:
        logger.error(f"JWT error in protected route: {str(e)}")
        return jsonify({"msg": "Invalid token"}), 401

# In your auth routes
@bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    current_user_id = get_jwt_identity()
    data = request.get_json()

    response = AuthService.change_user_password(
        current_user_id, 
        data.get('current_password'), 
        data.get('new_password')
    )

    return api_response(message=response["message"], status_code=response["status_code"])
