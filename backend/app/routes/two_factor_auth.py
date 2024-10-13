# app/routes/two_factor_auth.py

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.services.two_factor_auth_service import TwoFactorAuthService
from app.utils.response import api_response
from app.utils.decorators import rate_limit
from app.utils.decorators import permission_required

two_factor_auth_bp = Blueprint('two_factor_auth', __name__)

@two_factor_auth_bp.route('/initiate-setup', methods=['POST'])
@jwt_required()
@permission_required('initiate_2fa_setup')
@rate_limit(limit=5, per=60)  # 5 requests per minute
def initiate_2fa_setup():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return api_response(message="User not found", status_code=404)

    try:
        success, message = TwoFactorAuthService.initiate_2fa_setup(user)
        if success:
            return api_response(message=message, status_code=200)
        else:
            return api_response(message=message, status_code=400)
    except Exception as e:
        current_app.logger.error(f"Error in 2FA setup initiation: {str(e)}")
        return api_response(message="An error occurred during 2FA setup initiation", status_code=500)

@two_factor_auth_bp.route('/complete-setup', methods=['POST'])
@jwt_required()
@permission_required('complete_2fa_setup')
@rate_limit(limit=5, per=60)  # 5 requests per minute
def complete_2fa_setup():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return api_response(message="User not found", status_code=404)

    data = request.get_json()
    if not data or 'verification_code' not in data:
        return api_response(message="No verification code provided", status_code=400)

    try:
        result, message = TwoFactorAuthService.complete_2fa_setup(user, data['verification_code'])
        if result:
            return api_response(message=message, data=result, status_code=200)
        else:
            return api_response(message=message, status_code=400)
    except Exception as e:
        current_app.logger.error(f"Error in 2FA setup completion: {str(e)}")
        return api_response(message="An error occurred during 2FA setup completion", status_code=500)

@two_factor_auth_bp.route('/verify', methods=['POST'])
@jwt_required()
@permission_required('verify_2fa')
@rate_limit(limit=3, per=60)  # 3 requests per minute
def verify_2fa():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return api_response(message="User not found", status_code=404)

    data = request.get_json()
    if not data or 'code' not in data:
        return api_response(message="No 2FA code provided", status_code=400)

    try:
        success, message = TwoFactorAuthService.verify_2fa(user, data['code'])
        if success:
            return api_response(message=message, status_code=200)
        else:
            return api_response(message=message, status_code=400)
    except Exception as e:
        current_app.logger.error(f"Error in 2FA verification: {str(e)}")
        return api_response(message="An error occurred during 2FA verification", status_code=500)

@two_factor_auth_bp.route('/revoke', methods=['DELETE'])
@jwt_required()
@permission_required('revoke_2fa')
@rate_limit(limit=3, per=60)  # 3 requests per minute
def revoke_2fa():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return api_response(message="User not found", status_code=404)

    try:
        success, message = TwoFactorAuthService.revoke_2fa(user)
        if success:
            return api_response(message=message, status_code=200)
        else:
            return api_response(message=message, status_code=400)
    except Exception as e:
        current_app.logger.error(f"Error in 2FA revocation: {str(e)}")
        return api_response(message="An error occurred during 2FA revocation", status_code=500)
