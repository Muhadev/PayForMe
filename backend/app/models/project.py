from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Table, Enum, Boolean
from sqlalchemy.orm import relationship
from app import db

project_backers = Table('project_backers', db.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('project_id', Integer, ForeignKey('projects.id'))
)

class Project(db.Model):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    goal_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False)
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False)

    creator = relationship("User", back_populates="projects_created")
    category = relationship("Category", back_populates="projects")
    donations = relationship("Donation", back_populates="project")
    updates = relationship("Update", back_populates="project")
    comments = relationship("Comment", back_populates="project")
    backers = relationship("User", secondary=project_backers, back_populates="backed_projects")

    # Add these fields to the Project model
    status = Column(Enum('draft', 'active', 'funded', 'closed'), default='draft')
    featured = Column(Boolean, default=False)
    risk_and_challenges = Column(Text)
    video_url = Column(String(200))
    
    # Add this relationship
    project_updates = relationship("ProjectUpdate", back_populates="project")

    # Add these relationships
    media = relationship("Media", back_populates="project")
    tags = relationship("Tag", secondary="project_tags", back_populates="projects")
    faqs = relationship("FAQ", back_populates="project")