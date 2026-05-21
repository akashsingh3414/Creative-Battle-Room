import datetime
import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Round(Base):
    __tablename__ = "rounds"

    id = Column(String, primary_key=True, default=generate_uuid)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    prompt_theme = Column(String, nullable=False)
    status = Column(String, default="accepting_submissions")  # "accepting_submissions", "evaluating", "completed"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    room = relationship("Room", back_populates="rounds")
    submissions = relationship("Submission", back_populates="round", cascade="all, delete-orphan")
