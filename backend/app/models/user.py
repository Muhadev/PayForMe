from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm import relationship
from app import db

class User(db.Model):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    bio = Column(Text)
    created_at = Column(DateTime, nullable=False)
    
    projects_created = relationship("Project", back_populates="creator")
    donations = relationship("Donation", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    backed_projects = relationship("Project", secondary="project_backers", back_populates="backers")

    # Add these fields to the User model
    stripe_customer_id = Column(String(100), unique=True)
    is_verified = Column(Boolean, default=False)
    role = Column(Enum('user', 'admin'), default='user')
    last_login = Column(DateTime)
    
    # Add this relationship
    payments = relationship("Payment", back_populates="user")

    
    # Add these relationships
    notifications = relationship("Notification", back_populates="user")
    sent_messages = relationship("Message", foreign_keys="[Message.sender_id]")
    received_messages = relationship("Message", foreign_keys="[Message.recipient_id]")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'