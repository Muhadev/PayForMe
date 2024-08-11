from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app import db

class Category(db.Model):
    __tablename__ = 'categories'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    projects = relationship("Project", back_populates="category")