from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, Table
from sqlalchemy.orm import relationship
from app import db
from datetime import datetime

claimed_rewards = Table('claimed_rewards',
    db.Model.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('reward_id', Integer, ForeignKey('rewards.id'))
)

class Reward(db.Model):
    __tablename__ = 'rewards'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, ForeignKey('projects.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    minimum_amount = db.Column(db.Float, nullable=False)
    estimated_delivery_date = db.Column(db.DateTime)  # Changed from estimated_delivery to match schema
    shipping_type = db.Column(db.String(20))  # Add this field to match schema
    quantity_available = db.Column(db.Integer)
    quantity_claimed = db.Column(db.Integer, default=0)

    project = db.relationship("Project", back_populates="rewards")
    donations = db.relationship("Donation", back_populates="reward", foreign_keys="[Donation.reward_id]")  # Specify the correct foreign key here
    
    claimed_by = db.relationship('User', secondary=claimed_rewards,
                               backref=db.backref('claimed_rewards', lazy='dynamic'))

    def __repr__(self):
        return f'<Reward {self.title} for Project {self.project_id}>'