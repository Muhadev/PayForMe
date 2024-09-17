from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Table, Enum, Boolean
from sqlalchemy.orm import relationship
from . import db
from datetime import datetime
from enum import Enum

project_backers = Table('project_backers', db.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('project_id', Integer, ForeignKey('projects.id'))
)

class ProjectStatus(Enum):
    DRAFT = 'draft'
    ACTIVE = 'active'
    FUNDED = 'funded'
    CLOSED = 'closed'

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


    image_url = db.Column(db.String(255))  # Adding image_url field

    creator = db.relationship("User", back_populates="projects_created")
    rewards = db.relationship("Reward", back_populates="project")
    category = db.relationship("Category", back_populates="projects")
    donations = db.relationship("Donation", back_populates="project")
    updates = db.relationship("ProjectUpdate", back_populates="project")  # Corrected line
    comments = db.relationship("Comment", back_populates="project")
    backers = db.relationship("User", secondary=project_backers, back_populates="backed_projects")

    # Add these fields to the Project model
    status = db.Column(db.Enum(ProjectStatus), default=ProjectStatus.DRAFT)
    featured = db.Column(db.Boolean, default=False)
    risk_and_challenges = db.Column(db.Text)
    video_url = db.Column(db.String(200))
    
    # Add this relationship
    project_updates = db.relationship("ProjectUpdate", back_populates="project")  # Corrected relationship

    # Add these relationships
    media = db.relationship("Media", back_populates="project")
    tags = db.relationship("Tag", secondary="project_tags", back_populates="projects")
    faqs = db.relationship("FAQ", back_populates="project")

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'goal_amount': str(self.goal_amount),
            'current_amount': str(self.current_amount),
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'category_id': self.category_id,
            'featured': self.featured,
            'risk_and_challenges': self.risk_and_challenges,
            'video_url': self.video_url,
            'image_url': self.image_url,
            'status': self.status.value,
            'creator_id': self.creator_id
        }