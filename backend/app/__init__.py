from flask import Flask, jsonify, request
import logging
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.utils.redis_client import get_redis_client
from flask_cors import CORS
# from flask_cors import CORS
from flask_uploads import configure_uploads, IMAGES, UploadSet
from config import Config
from flask_caching import Cache
from app.utils.tasks import make_celery
import os

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=["1000 per day", "200 per hour"])
photos = UploadSet('photos', IMAGES)  # Define an UploadSet for images
videos = UploadSet('videos', ('mp4', 'avi', 'mov'))
cache = Cache()

# Create logger at module level
logger = logging.getLogger(__name__)

def configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

def create_app():

    # Configure logging first
    configure_logging()

    app = Flask(__name__, static_folder='static', static_url_path='/static')
    app.config.from_object(Config)

    app.config['UPLOAD_FOLDER'] = 'app/static/uploads/profiles'
    
    # In your app initialization
    upload_dir = os.path.join(app.root_path, 'static', 'uploads', 'profiles')
    os.makedirs(upload_dir, exist_ok=True)

    app.config['UPLOADED_FILES_URL'] = '/uploads/'

    try:
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
        
        # Configure CORS

        # CORS(app, supports_credentials=True)  # Allow credentials

        CORS(app, supports_credentials=True, resources={
            r"/api/*": {
                "origins": ["http://localhost:3000"],  # Add your frontend URL
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "expose_headers": ["Content-Type", "Authorization"],
                "max_age": 600  # Cache preflight requests for 10 minutes
            }
        })
        # auth-related routes
        from app.routes.auth import bp as auth_bp
        app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')

        # auth/google-related routes
        from app.routes.google_auth import google_auth
        app.register_blueprint(google_auth, url_prefix='/api/v1/google_auth/')

        # User-related routes
        from app.routes.profile_routes import profile_bp
        app.register_blueprint(profile_bp, url_prefix='/api/v1/profile')

        # 2fa-related routes
        from app.routes.two_factor_auth import two_factor_auth_bp
        app.register_blueprint(two_factor_auth_bp, url_prefix='/api/v1/auth/2fa')

        # Admin routes
        from app.routes.role_permissions import role_permissions_bp
        app.register_blueprint(role_permissions_bp, url_prefix='/api/v1/role_permissions')

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

        @app.errorhandler(422)
        def handle_validation_error(e):
            return jsonify({
                "status": "error",
                "message": "Invalid request data",
                "errors": e.data['messages'] if hasattr(e, 'data') else None
            }), 422
        
        return app
    except Exception as e:
        logger.error(f"Failed to initialize app extensions: {e}")
        raise