# app/utils/decorators.py

from functools import wraps
from flask_jwt_extended import get_jwt_identity
from app.services.role_permission_service import RolePermissionService
from app.utils.response import api_response, error_response, success_response
from app.models.user import User
from app import db
from flask_jwt_extended import get_jwt
import time
from flask import request

import logging

logger = logging.getLogger(__name__)

def permission_required(permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            jwt_claims = get_jwt()
            logger.debug(f"Checking permission '{permission}' for user {current_user_id}")

            user_permissions = jwt_claims.get("permissions", [])
            last_permission_update = jwt_claims.get("last_permission_update")

            user = User.query.get(current_user_id)
            if not user:
                logger.error(f"User {current_user_id} not found.")
                return error_response(message="User not found", status_code=404)

            # Check if permissions are outdated
            if user.last_permission_update and last_permission_update:
                if user.last_permission_update.timestamp() > last_permission_update:
                    logger.warning(f"User {current_user_id}'s permissions are outdated. Requesting re-login.")
                    return error_response(message="Your permissions have been updated. Please log in again.", status_code=401)
            elif user.last_permission_update and not last_permission_update:
                logger.warning(f"Missing last_permission_update in JWT for user {current_user_id}. Requesting re-login.")
                return error_response(message="Your session is invalid. Please log in again.", status_code=401)

            logger.debug(f"User {current_user_id} permissions from JWT: {user_permissions}")
            
            if permission not in user_permissions:
                logger.warning(f"User {current_user_id} attempted to access {permission} without the required permission.")
                return error_response(message="You don't have permission to perform this action", status_code=403)
    
            logger.info(f"User {current_user_id} granted access to {permission}")
            return f(*args, **kwargs)
        return decorated_function
    return decorator