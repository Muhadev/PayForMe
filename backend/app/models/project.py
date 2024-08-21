from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Table, Enum, Boolean
from sqlalchemy.orm import relationship
from . import db
from datetime import datetime

project_backers = Table('project_backers', db.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('project_id', Integer, ForeignKey('projects.id'))
)

class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    goal_amount = db.Column(db.Float, nullable=False)
    current_amount = db.Column(db.Float, default=0)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)  # Set default value
    creator_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.Integer, ForeignKey('categories.id'), nullable=False)

    creator = db.relationship("User", back_populates="projects_created")
    rewards = db.relationship("Reward", back_populates="project")
    category = db.relationship("Category", back_populates="projects")
    donations = db.relationship("Donation", back_populates="project")
    updates = db.relationship("ProjectUpdate", back_populates="project")  # Corrected line
    comments = db.relationship("Comment", back_populates="project")
    backers = db.relationship("User", secondary=project_backers, back_populates="backed_projects")

    # Add these fields to the Project model
    status = db.Column(db.Enum('draft', 'active', 'funded', 'closed'), default='draft')
    featured = db.Column(db.Boolean, default=False)
    risk_and_challenges = db.Column(db.Text)
    video_url = db.Column(db.String(200))
    
    # Add this relationship
    project_updates = db.relationship("ProjectUpdate", back_populates="project")

    # Add these relationships
    media = db.relationship("Media", back_populates="project")
    tags = db.relationship("Tag", secondary="project_tags", back_populates="projects")
    faqs = db.relationship("FAQ", back_populates="project")

    def __repr__(self):
        return f'<Project {self.title}>'