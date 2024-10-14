from redis import Redis
from flask import current_app

def get_redis_client():
    # Ensure this runs within an application context
    redis_url = current_app.config.get('REDIS_URL')
    
    try:
        redis_client = Redis.from_url(redis_url, decode_responses=True)
        return redis_client
    except Exception as e:
        current_app.logger.error(f"Error connecting to Redis: {e}")
        raise ConnectionError("Failed to connect to Redis")
