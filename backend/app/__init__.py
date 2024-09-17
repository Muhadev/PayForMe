from flask import Flask
import logging
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_uploads import configure_uploads, IMAGES, UploadSet
from config import Config
import os

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
photos = UploadSet('photos', IMAGES)  # Define an UploadSet for images
videos = UploadSet('videos', ('mp4', 'avi', 'mov'))

def configure_logging():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Ensure upload folders are properly configured
    upload_folders = [
        app.config['UPLOADED_PHOTOS_DEST'],
        app.config['UPLOADED_VIDEOS_DEST']
    ]
    
    for folder in upload_folders:
        try:
            os.makedirs(folder, exist_ok=True)
            app.logger.info(f"Created upload folder: {folder}")
        except OSError as e:
            app.logger.error(f"Failed to create upload folder {folder}: {e}")
            raise
            # You might want to raise a custom exception here or handle it appropriately

    # Configure Flask-Uploads
    configure_uploads(app, (photos, videos))

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    CORS(app)
    configure_logging()

    from app.routes.auth import bp as auth_bp
    app.register_blueprint(auth_bp)

    from app.routes.google_auth import google_auth
    app.register_blueprint(google_auth)

    from app.routes.profile_routes import profile_bp
    app.register_blueprint(profile_bp)

    from app.routes.role_permissions import role_permissions_bp
    app.register_blueprint(role_permissions_bp)

    from app.routes.projects import projects_bp
    app.register_blueprint(projects_bp)

    from app.routes.categories import categories_bp
    app.register_blueprint(categories_bp)

    return app