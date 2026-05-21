import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

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


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True)  # Short alphanumeric room code (e.g. PQ37X)
    name = Column(String, nullable=False)
    host_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="waiting")  # "waiting", "active", "completed"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    host = relationship("User", back_populates="hosted_rooms")
    rounds = relationship("Round", back_populates="room", cascade="all, delete-orphan")
    events = relationship("RoomEvent", back_populates="room", cascade="all, delete-orphan")


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


class RoomEvent(Base):
    __tablename__ = "room_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    event_type = Column(String, nullable=False)  # e.g., "USER_JOINED", "ROUND_STARTED"
    payload = Column(Text, nullable=False)  # JSON serialized event data
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    room = relationship("Room", back_populates="events")


class UserRoomHistory(Base):
    __tablename__ = "user_room_history"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    role = Column(String, nullable=False)  # "host" or "participant"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    room = relationship("Room")

