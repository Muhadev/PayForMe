from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask import jsonify
from app.models import User

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            if user.role != 'admin':
                return jsonify(msg="Admins only!"), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper