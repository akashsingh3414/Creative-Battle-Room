from datetime import datetime
from pydantic import BaseModel, Field
from .user import UserOut

class RoomCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)

class RoomOut(BaseModel):
    id: str
    name: str
    host_id: str
    status: str
    created_at: datetime
    host: UserOut

    class Config:
        from_attributes = True

class RoomEventOut(BaseModel):
    id: str
    room_id: str
    event_type: str
    payload: str
    created_at: datetime

    class Config:
        from_attributes = True

class RoomHistoryOut(BaseModel):
    code: str
    name: str
    role: str
    timestamp: int  # JS epoch timestamp in milliseconds
    completed: bool

    class Config:
        from_attributes = True
