import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    round_id = Column(String, ForeignKey("rounds.id"), nullable=False)
    participant_id = Column(String, ForeignKey("users.id"), nullable=False)
    user_prompt = Column(Text, nullable=False)
    generated_content = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    rank = Column(Integer, nullable=True)
    status = Column(String, default="active")  # "active", "eliminated"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    round = relationship("Round", back_populates="submissions")
    participant = relationship("User", back_populates="submissions")
    job = relationship("Job", back_populates="submission", uselist=False, cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False)
    status = Column(String, default="queued")  # "queued", "running", "completed", "failed", "timed_out"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    submission = relationship("Submission", back_populates="job")
