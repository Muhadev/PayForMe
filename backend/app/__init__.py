from flask import Flask
import logging
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.utils.redis_client import get_redis_client
from flask_cors import CORS
from flask_uploads import configure_uploads, IMAGES, UploadSet
from config import Config
from flask_caching import Cache
from app.utils.tasks import make_celery
import os

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
photos = UploadSet('photos', IMAGES)  # Define an UploadSet for images
videos = UploadSet('videos', ('mp4', 'avi', 'mov'))
cache = Cache()

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

    # Initialize Redis client within app context
    with app.app_context():
        app.redis_client = get_redis_client()

    cache.init_app(app)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    CORS(app)
    configure_logging()

    # auth-related routes
    from app.routes.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')

    # auth/google-related routes
    from app.routes.google_auth import google_auth
    app.register_blueprint(google_auth, url_prefix='/api/v1/auth/google')

    # User-related routes
    from app.routes.profile_routes import profile_bp
    app.register_blueprint(profile_bp, url_prefix='/api/v1/profile')

    # 2fa-related routes
    from app.routes.two_factor_auth import two_factor_auth_bp
    app.register_blueprint(two_factor_auth_bp, url_prefix='/api/v1/auth/2fa')

    # Admin routes
    from app.routes.role_permissions import role_permissions_bp
    app.register_blueprint(role_permissions_bp, url_prefix='/api/v1/admin')

    # Project-related routes
    from app.routes.projects import projects_bp
    app.register_blueprint(projects_bp, url_prefix='/api/v1/projects')

    # Categories-related routes
    from app.routes.categories import categories_bp
    app.register_blueprint(categories_bp, url_prefix='/api/v1/categories')

    # Backers-related routes
    from app.routes.backer_routes import backer_bp
    app.register_blueprint(backer_bp, url_prefix='/api/v1/backers')

    # Notification-related routes
    from app.routes.notifications import notifications_bp  # Import the notifications blueprint
    app.register_blueprint(notifications_bp, url_prefix='/api/v1/notifications')  # Register the blueprint

    #Reward-related routes
    from app.routes.reward_routes import reward_bp
    app.register_blueprint(reward_bp, url_prefix='/api/v1/rewards')

    # Add Donation, Payment, and Stripe Webhook blueprints
    # from app.routes.donation_routes import donation_bp
    # app.register_blueprint(donation_bp, url_prefix='/api/v1/donations')

    # from app.routes.payment_routes import payment_bp
    # app.register_blueprint(payment_bp, url_prefix='/api/v1/payments/donations')

    # from app.routes.webhooks.stripe_webhook import stripe_webhook_bp
    # app.register_blueprint(stripe_webhook_bp, url_prefix='/api/v1/webhooks/stripe')
    
    return app