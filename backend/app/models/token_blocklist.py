from app import db
from sqlalchemy import Column, Integer, String, DateTime

class TokenBlocklist(db.Model):
    __tablename__ = 'token_blocklist'

    id = Column(Integer, primary_key=True)
    jti = Column(String(36), nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False)

    def __repr__(self):
        return f'<TokenBlocklist {self.jti}>'