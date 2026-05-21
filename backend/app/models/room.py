import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

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
