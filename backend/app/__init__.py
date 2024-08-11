from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    from app.models import User, Project, Donation, Category, Comment, ProjectUpdate, Payment, Reward, Notification, Media, Tag, FAQ, Message

    with app.app_context():
        db.create_all()

    # Register blueprints here (we'll create these later)
    from app.routes import main, auth, projects, donations
    app.register_blueprint(main.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(projects.bp)
    app.register_blueprint(donations.bp)

    return app