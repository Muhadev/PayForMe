from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Table, Boolean, Enum, Numeric
from sqlalchemy.orm import relationship
from . import db
from decimal import Decimal
from datetime import datetime
from .enums import ProjectStatus

project_backers = Table('project_backers', db.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('project_id', Integer, ForeignKey('projects.id'))
)

class Project(db.Model):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    current_amount = Column(Numeric(10, 2))  # 10 digits in total, 2 after decimal point
    goal_amount = Column(Numeric(10, 2))
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False)
    image_url = Column(String(255))
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT)
    featured = Column(Boolean, default=False)
    risk_and_challenges = Column(Text)
    video_url = Column(String(200))

    # Add soft delete fields
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime)
    backers_count = db.Column(db.Integer, default=0)

    payouts = db.relationship("Payout", back_populates="project")
    # Add a field to track if the project funds are available for withdrawal
    funds_available = db.Column(db.Boolean, default=False)
    
    # Relationships
    creator = relationship("User", back_populates="projects_created")
    rewards = relationship("Reward", back_populates="project")
    category = relationship("Category", back_populates="projects")
    donations = relationship("Donation", back_populates="project")
    saved_by_users = db.relationship("SavedProject", 
                                back_populates="project", 
                                cascade="all, delete-orphan")
    # updates = relationship("ProjectUpdate", back_populates="project")
    comments = relationship("Comment", back_populates="project")
    backers = relationship("User", secondary=project_backers, back_populates="backed_projects")
    project_updates = relationship("ProjectUpdate", back_populates="project")
    media = relationship("Media", back_populates="project")
    tags = relationship("Tag", secondary="project_tags", back_populates="projects")
    faqs = relationship("FAQ", back_populates="project")
    
    # Add this relationship
    project_roles = db.relationship('ProjectRole', back_populates='project', lazy='dynamic')

    # Add these properties to convert to/from Decimal
    # @property
    # def current_amount_decimal(self):
    #     return Decimal(str(self.current_amount))

    # @current_amount_decimal.setter
    # def current_amount_decimal(self, value):
    #     self.current_amount = value

    # @property
    # def goal_amount_decimal(self):
    #     return Decimal(str(self.goal_amount))

    # @goal_amount_decimal.setter
    # def goal_amount_decimal(self, value):
    #     self.goal_amount = value

    def __init__(self, **kwargs):
        super(Project, self).__init__(**kwargs)
        if 'status' in kwargs:
            if isinstance(kwargs['status'], str):
                self.status = ProjectStatus.from_string(kwargs['status'])
            elif isinstance(kwargs['status'], ProjectStatus):
                self.status = kwargs['status']
            else:
                self.status = ProjectStatus.DRAFT

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "goal_amount": self.goal_amount,
            "current_amount": self.current_amount,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "created_at": self.created_at.isoformat(),
            "creator_id": self.creator_id,
            "category_id": self.category_id,
            "image_url": self.image_url,
            "status": self.status.value,
            "featured": self.featured,
            "risk_and_challenges": self.risk_and_challenges,
            "video_url": self.video_url,
            "is_deleted": self.is_deleted,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }