from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app import db

class Reward(db.Model):
    __tablename__ = 'rewards'

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    minimum_amount = Column(Float, nullable=False)
    estimated_delivery = Column(DateTime)
    quantity_available = Column(Integer)
    quantity_claimed = Column(Integer, default=0)

    project = relationship("Project", back_populates="rewards")
    donations = relationship("Donation", back_populates="reward")

    def __repr__(self):
        return f'<Reward {self.title} for Project {self.project_id}>'