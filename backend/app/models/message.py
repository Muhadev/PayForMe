from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app import db

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    
    sender_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)

    # Define the relationships
    sender = db.relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = db.relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")

    def __repr__(self):
        return f'<Message {self.id} from {self.sender_id} to {self.receiver_id}>'