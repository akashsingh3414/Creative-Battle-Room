import random
import json
import datetime
from sqlalchemy.orm import Session
from app.models import Room, RoomEvent, UserRoomHistory

class RoomService:
    def __init__(self, db: Session):
        self.db = db

    def _generate_room_code(self) -> str:
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        while True:
            code = "".join(random.choice(chars) for _ in range(5))
            exists = self.db.query(Room).filter(Room.id == code).first()
            if not exists:
                return code

    def create(self, name: str, host_id: str) -> Room:
        room_code = self._generate_room_code()
        db_room = Room(
            id=room_code,
            name=name,
            host_id=host_id,
            status="waiting"
        )
        self.db.add(db_room)
        self.db.commit()
        self.db.refresh(db_room)
        return db_room

    def get(self, room_id: str) -> Room | None:
        return self.db.query(Room).filter(Room.id == room_id).first()

    def add_history(self, user_id: str, room_id: str, role: str) -> UserRoomHistory:
        existing = self.db.query(UserRoomHistory).filter(
            UserRoomHistory.user_id == user_id,
            UserRoomHistory.room_id == room_id
        ).first()
        if existing:
            # Maintain higher host privilege
            if existing.role != "host" and role == "host":
                existing.role = "host"
            existing.timestamp = datetime.datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing)
            return existing
            
        db_history = UserRoomHistory(
            user_id=user_id,
            room_id=room_id,
            role=role
        )
        self.db.add(db_history)
        self.db.commit()
        self.db.refresh(db_history)
        return db_history

    def get_user_history(self, user_id: str) -> list[UserRoomHistory]:
        return self.db.query(UserRoomHistory).filter(
            UserRoomHistory.user_id == user_id
        ).order_by(UserRoomHistory.timestamp.desc()).limit(15).all()

    def create_event(self, room_id: str, event_type: str, payload_data: dict) -> RoomEvent:
        db_event = RoomEvent(
            room_id=room_id,
            event_type=event_type,
            payload=json.dumps(payload_data)
        )
        self.db.add(db_event)
        self.db.commit()
        self.db.refresh(db_event)
        return db_event
