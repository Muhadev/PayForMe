# app/utils/decorators.py

from functools import wraps
from flask_jwt_extended import get_jwt_identity
from app.services.role_permission_service import RolePermissionService
from app.utils.response import api_response
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
            
            logger.debug(f"User {current_user_id} permissions from JWT: {user_permissions}")
            
            if permission not in user_permissions:
                logger.warning(f"User {current_user_id} tried to access {permission} without required permission. JWT permissions: {user_permissions}")
                return api_response(message="You don't have permission to perform this action", status_code=403)
    
            logger.info(f"User {current_user_id} granted access to {permission}")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def rate_limit(limit, per):
    def decorator(f):
        last_reset = {}
        count = {}
        @wraps(f)
        def decorated_function(*args, **kwargs):
            now = time.time()
            key = f"{get_jwt_identity() or request.remote_addr}:{f.__name__}"
            
            if key not in last_reset or now - last_reset[key] > per:
                count[key] = 1
                last_reset[key] = now
            else:
                count[key] += 1
            
            if count[key] > limit:
                return api_response(message="Rate limit exceeded", status_code=429)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator