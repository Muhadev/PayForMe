from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app import db

class Reward(db.Model):
    __tablename__ = 'rewards'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, ForeignKey('projects.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    minimum_amount = db.Column(db.Float, nullable=False)
    estimated_delivery = db.Column(db.DateTime)
    quantity_available = db.Column(db.Integer)
    quantity_claimed = db.Column(db.Integer, default=0)

    project = db.relationship("Project", back_populates="rewards")
    donations = db.relationship("Donation", back_populates="reward", foreign_keys="[Donation.reward_id]")  # Specify the correct foreign key here
    

    def __repr__(self):
        return f'<Reward {self.title} for Project {self.project_id}>'