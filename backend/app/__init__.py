from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_httpauth import HTTPBasicAuth
from flask_jwt_extended import JWTManager
from config import Config
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address)

limiter = Limiter(
    get_remote_address,
    app=current_app,
    default_limits=["200 per day", "50 per hour"]  # Global rate limits
)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)

    # Set global limits
    limiter.limit("200 per day")(app)
    limiter.limit("50 per hour")(app)
    
    from app.models import User, Project, Donation, Category, Comment, ProjectUpdate, Payment, Reward, Notification, Media, Tag, FAQ, Message, TokenBlocklist

    with app.app_context():
        db.create_all()

    # Register blueprints here (we'll create these later)
    # from app.routes import main, auth, projects, donations
    # app.register_blueprint(main.bp)
    # app.register_blueprint(auth.bp)
    # app.register_blueprint(projects.bp)
    # app.register_blueprint(donations.bp)

    return app