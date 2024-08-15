from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app import db

class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    projects = db.relationship("Project", back_populates="category")

    def __repr__(self):
        return f'<Category {self.name}>'