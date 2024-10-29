from redis import Redis
from flask import current_app
from app.utils.some_module import ConfigurationError

# Recommended
def get_redis_client():
    redis_url = current_app.config.get('REDIS_URL')
    if not redis_url:
        raise ConfigurationError("REDIS_URL configuration is missing")
        
    redis_options = {
        'decode_responses': True,
        'socket_timeout': 5,
        'socket_connect_timeout': 5,
        'retry_on_timeout': True
    }
    
    try:
        redis_client = Redis.from_url(redis_url, **redis_options)
        redis_client.ping()  # Verify connection
        return redis_client
    except Exception as e:
        current_app.logger.error(f"Redis connection error: {e}")
        raise ConnectionError(f"Failed to connect to Redis: {e}")