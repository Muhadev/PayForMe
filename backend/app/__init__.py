from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from config import Config
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)

    from app.models import (
        User, Project, Donation, Category, Comment, ProjectUpdate, Payment, Reward, 
        Notification, Media, Tag, FAQ, Message, TokenBlocklist
    )

    
    # Import and register blueprints here
    from app.routes.auth import bp as auth_bp
    app.register_blueprint(auth_bp)

    return app
