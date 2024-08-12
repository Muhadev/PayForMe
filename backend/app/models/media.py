from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from app import db
import enum

class MediaType(enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"

class Media(db.Model):
    __tablename__ = 'media'

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    type = Column(Enum(MediaType), nullable=False)
    url = Column(String(255), nullable=False)
    caption = Column(String(255))
    order = Column(Integer, default=0)

    project = relationship("Project", back_populates="media")
    