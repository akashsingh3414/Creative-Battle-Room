from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas import RoomHistoryOut
from app.services.room_service import RoomService
from app.core import security
from app.core.database import get_db
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/history", response_model=List[RoomHistoryOut])
def get_user_room_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(security.get_current_user)
):
    room_service = RoomService(db)
    histories = room_service.get_user_history(current_user.id)
    result = []
    for h in histories:
        if h.room:
            result.append({
                "code": h.room_id,
                "name": h.room.name,
                "role": h.role,
                "timestamp": int(h.timestamp.timestamp() * 1000),
                "completed": h.room.status == "completed"
            })
    return result
