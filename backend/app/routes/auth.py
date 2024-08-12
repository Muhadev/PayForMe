from flask import Blueprint, jsonify, request, current_app, url_for
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.models import User
from app import jwt
from app.services.auth_service import AuthService
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

# Configure logging
logger = logging.getLogger(__name__)
# Initialize Limiter
limiter = Limiter(
    get_remote_address,
    app=current_app,
    default_limits=["200 per day", "50 per hour"]  # Global rate limits
)
bp = Blueprint('auth', __name__, url_prefix='/auth')

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return AuthService.check_if_token_revoked(jti)

@bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    success, message = AuthService.verify_email(token)
    if success:
        logger.info(f"Email verification successful for token: {token}")
        return jsonify({"msg": message}), 200
    return jsonify({"msg": message}), 400

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not all(k in data for k in ("username", "email", "password")):
        logger.warning("Registration attempt with missing fields")
        return jsonify({"msg": "Missing required fields"}), 400

    success, message = AuthService.register_user(
        data['username'],
        data['email'],
        data['password'],
        data.get('full_name')
    )

    if success:
        logger.info(f"New user registered: {data['username']}")
        return jsonify({"msg": message}), 201
    else:
        logger.warning(f"Failed registration attempt for username: {data['username']}")
        return jsonify({"msg": message}), 400

@bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")  # Custom rate limit for login
def login():
    data = request.get_json()

    if not all(k in data for k in ("username", "password")):
        logger.warning("Login attempt with missing username or password")
        return jsonify({"msg": "Missing username or password"}), 400

    success, result = AuthService.login_user(data['username'], data['password'])

    if success:
        logger.info(f"User {data['username']} logged in successfully")
        access_token = create_access_token(identity=result)
        refresh_token = create_refresh_token(identity=result)
        return jsonify(access_token=access_token, refresh_token=refresh_token), 200
    else:
        logger.warning(f"Failed login attempt for username: {data['username']}")
        return jsonify({"msg": result}), 401

@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user)
    logger.info(f"Access token refreshed for user: {current_user}")
    return jsonify(access_token=new_access_token), 200

@bp.route('/logout', methods=['DELETE'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    success, message = AuthService.logout_user(jti)
    logger.info(f"User logged out and JWT revoked with jti: {jti}")
    return jsonify(msg=message), 200

@bp.route('/password-reset-request', methods=['POST'])
def password_reset_request():
    data = request.get_json()
    success, message = AuthService.initiate_password_reset(data['email'])
    logger.info(f"Password reset request initiated for email: {data['email']}")
    return jsonify({"msg": message}), 200

@bp.route('/password-reset/<token>', methods=['POST'])
def password_reset(token):
    data = request.get_json()
    success, message = AuthService.reset_password(token, data['password'])
    if success:
        logger.info(f"Password reset successful for token: {token}")
        return jsonify({"msg": message}), 200
    else:
        logger.warning(f"Failed password reset attempt with token: {token}")
        return jsonify({"msg": message}), 400

@bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    logger.info(f"Protected resource accessed by user: {user.username}")
    return jsonify(logged_in_as=user.username), 200