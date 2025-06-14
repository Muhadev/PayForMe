import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import timedelta
import stripe

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
    SENDGRID_DEFAULT_FROM = os.environ.get('SENDGRID_DEFAULT_FROM', 'noreply@yourdomain.com')
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    FRONTEND_URL = os.environ.get('FRONTEND_URL')  # React app URL
    FRONTEND_SUCCESS_URL = f'{FRONTEND_URL}/donation/success'
    FRONTEND_CANCEL_URL = f'{FRONTEND_URL}/donation/cancel'
    
    # Base upload folder
    UPLOAD_FOLDERS = os.path.abspath(os.path.join(os.getcwd(), 'uploads'))
    
    UPLOADS_DEFAULT_URL = os.getenv('UPLOADS_DEFAULT_URL', 'http://localhost:5000/uploads/')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 100 * 1024 * 1024))  # Increase to 100 MB
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'png,jpg,jpeg,gif').split(','))
    ALLOWED_VIDEO_EXTENSIONS = set(os.getenv('ALLOWED_VIDEO_EXTENSIONS', 'mp4,avi,mov').split(','))
    
    # Specific upload destinations
    UPLOADED_PHOTOS_DEST = os.path.abspath(os.path.join(UPLOAD_FOLDERS, 'photos'))
    UPLOADED_VIDEOS_DEST = os.path.abspath(os.path.join(UPLOAD_FOLDERS, 'videos'))
    
    FIRST_ADMIN_SECRET_KEY = os.environ.get('FIRST_ADMIN_SECRET_KEY')
    
    # Set JWT expiration times
    # Convert seconds from env to timedelta, with fallback values
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 86400))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 2592000))
    )
    
    # Redis configuration
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = os.getenv('REDIS_PORT', 6379)
    REDIS_DB = os.getenv('REDIS_DB', 0)
    REDIS_URL = os.getenv('REDIS_URL', f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}')
    
    # Configure Flask-Caching with Redis
    CACHE_TYPE = 'redis'
    CACHE_REDIS_URL = REDIS_URL  # Use the same URL for caching
    
    # Stripe configuration
    STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
    STRIPE_LOGGING = os.getenv('STRIPE_LOGGING', False)
    STRIPE_CONNECT_WEBHOOK_SECRET = os.getenv('STRIPE_CONNECT_WEBHOOK_SECRET')
    
    # Platform fee configuration for payouts (defaults to 5% if not set)
    PLATFORM_FEE_PERCENTAGE = os.getenv('PLATFORM_FEE_PERCENTAGE', '5')