import os
from flask import Flask
import logging
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
csrf = CSRFProtect()

def configure_logging():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    csrf.init_app(app)

def register_blueprints(app):
    from app.routes.auth import bp as auth_bp
    from app.routes.google_auth import google_auth
    from app.routes.profile_routes import profile_bp
    from app.routes.role_permissions import role_permissions_bp
    from app.routes.projects import projects_bp
    from app.routes.categories import categories_bp

    blueprints = [
        auth_bp,
        google_auth,
        profile_bp,
        role_permissions_bp,
        projects_bp,
        categories_bp
    ]

    for bp in blueprints:
        app.register_blueprint(bp)

def create_app(config_name='default'):
    app = Flask(__name__)

    from config import Config
    app.config.from_object(Config[config_name])

    app.config['WTF_CSRF_ENABLED'] = True

    init_extensions(app)

    configure_logging()

    # Import models
    from app.models import (
        User, Project, Donation, Category, Comment, ProjectUpdate, Payment, Reward,
        Notification, Media, Tag, FAQ, Message, TokenBlocklist, Role, Permission
    )

    # Register blueprints
    register_blueprints(app)

    # Global error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error(f"Unhandled exception: {str(e)}")
        return "An unexpected error occurred", 500

    return app

# Environment-specific configuration
def get_env_config():
    env = os.environ.get('APP_ENV', 'production')
    if env == 'development':
        return 'development'
    elif env == 'testing':
        return 'testing'
    else:
        return 'production'

# Application instance
app = create_app(get_env_config())

if __name__ == '__main__':
    app.run()
