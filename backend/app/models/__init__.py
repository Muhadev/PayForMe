from app import db

# User-related models
from .user import User
from .notification import Notification, NotificationType
from .message import Message

# Project-related models
from .project import Project
from .category import Category
from .comment import Comment
from .project_update import ProjectUpdate
from .tag import Tag
from .faq import FAQ
from .media import Media, MediaType

# Financial models
from .donation import Donation
from .payment import Payment, PaymentStatus, PaymentMethod
from .reward import Reward

# We don't need to create a Base here since we're using Flask-SQLAlchemy
# The db.Model will serve as our declarative base

# If you need to create tables or use metadata, you can access it via db.metadata

def init_app(app):
    # This function can be used to set up any models-related
    # configuration or initial data
    pass