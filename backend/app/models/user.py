import datetime
import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_seed = Column(String, nullable=True)  # Seed for customizable avatar visual representation
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    hosted_rooms = relationship("Room", back_populates="host")
    submissions = relationship("Submission", back_populates="participant")
