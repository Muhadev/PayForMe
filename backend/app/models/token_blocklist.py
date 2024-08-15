from app import db
from sqlalchemy import Column, Integer, String, DateTime

class TokenBlocklist(db.Model):
    __tablename__ = 'token_blocklist'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, nullable=False)

    def __repr__(self):
        return f'<TokenBlocklist {self.jti}>'