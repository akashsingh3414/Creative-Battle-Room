from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas import RoomCreate, RoomOut
from app.services.room_service import RoomService
from app.core import security
from app.core.database import get_db
from app.models import User, Room

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.post("", response_model=RoomOut)
def create_new_room(
    room_schema: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    room_service = RoomService(db)
    room = room_service.create(room_schema.name, current_user.id)
    # Persist room history record for the host instantly in SQLite
    room_service.add_history(current_user.id, room.id, "host")
    return room

@router.get("/{room_id}", response_model=RoomOut)
def get_room_details(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    room_service = RoomService(db)
    room = room_service.get(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested room does not exist."
        )
    return room

@router.get("", response_model=List[RoomOut])
def get_all_active_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    return db.query(Room).filter(Room.status != "completed").order_by(Room.created_at.desc()).all()
