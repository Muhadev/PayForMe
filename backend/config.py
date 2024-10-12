import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import timedelta


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
    # UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './uploads')
    FRONTEND_URL = os.environ.get('FRONTEND_URL')  # React app URL
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.getcwd(), 'uploads'))
    UPLOADS_DEFAULT_URL = os.getenv('UPLOADS_DEFAULT_URL', 'http://localhost:5000/uploads/')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # Default 16 MB
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'png,jpg,jpeg,gif').split(','))
    ALLOWED_VIDEO_EXTENSIONS = set(os.getenv('ALLOWED_VIDEO_EXTENSIONS', 'mp4,avi,mov').split(','))
    # Use a relative path for UPLOAD_FOLDER
    # UPLOAD_FOLDER = os.path.join(str(Path.home()), 'payforme_uploads')
    FIRST_ADMIN_SECRET_KEY = os.environ.get('FIRST_ADMIN_SECRET_KEY')

    # Set JWT expiration times
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=5)  # Adjust the time as needed
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    
    # Set specific upload destinations for photos and videos
    UPLOADED_PHOTOS_DEST = os.path.join(UPLOAD_FOLDER, 'photos')
    UPLOADED_VIDEOS_DEST = os.path.join(UPLOAD_FOLDER, 'videos')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

# You can add more configurations as needed, like TestingConfig

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    return config[os.environ.get('FLASK_ENV') or 'default']