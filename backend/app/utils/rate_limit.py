import time
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask import request, current_app
from app.utils.response import error_response
from app.utils.redis_client import get_redis_client
import logging
from functools import wraps
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

def rate_limit(limit, per):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            with current_app.app_context():
                try:
                    now = time.time()
                    redis_client = get_redis_client()  # Call the function to get the Redis client

                    # Try to verify JWT, fall back to IP if not available
                    try:
                        verify_jwt_in_request(optional=True)
                        identity = get_jwt_identity()
                    except Exception:
                        identity = None

                    if identity is None:
                        identity = request.headers.get('X-Forwarded-For', request.remote_addr)

                    key = f"rate_limit:{identity}:{f.__name__}"

                    reset_key = f"rl_reset:{key}"
                    count_key = f"rl_count:{key}"

                    last_reset = redis_client.get(reset_key)
                    count = redis_client.get(count_key)

                    if not last_reset or now - float(last_reset) > per:
                        redis_client.set(reset_key, now, ex=per)
                        redis_client.set(count_key, 1, ex=per)
                        count = 1
                    else:
                        count = int(count or 0) + 1
                        redis_client.set(count_key, count, ex=per)

                    if count > limit:
                        time_to_reset = per - (now - float(last_reset))
                        return error_response(
                            message="Rate limit exceeded. Please try again later.",
                            status_code=429,
                            meta={"retry_after": round(time_to_reset, 2)}
                        )
                except RedisError as e:
                    logger.error(f"Redis error in rate limiting: {str(e)}")
                    return error_response(
                        message="Service is currently unavailable. Please try again later.",
                        status_code=503
                    )
                except Exception as e:
                    logger.error(f"Unexpected error in rate limiting: {str(e)}")
                    return error_response(
                        message="An unexpected error occurred. Please try again later.",
                        status_code=500
                    )
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator