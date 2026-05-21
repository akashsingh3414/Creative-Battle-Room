from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# Authentication & User
class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=4)
    avatar_seed: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    avatar_seed: str | None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    user_id: str | None = None


# Room
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


# Round
class RoundCreate(BaseModel):
    prompt_theme: str = Field(..., min_length=5, max_length=500)

class RoundOut(BaseModel):
    id: str
    room_id: str
    round_number: int
    prompt_theme: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Job
class JobOut(BaseModel):
    id: str
    submission_id: str
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Submission
class SubmissionCreate(BaseModel):
    user_prompt: str = Field(..., min_length=3, max_length=1000)

class SubmissionScore(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0)
    rank: int | None = Field(None, ge=1)
    status: str = Field("active")  # "active", "eliminated"

class SubmissionOut(BaseModel):
    id: str
    round_id: str
    participant_id: str
    user_prompt: str
    generated_content: str | None
    image_url: str | None
    score: float | None
    rank: int | None
    status: str
    created_at: datetime
    participant: UserOut
    job: JobOut | None = None

    class Config:
        from_attributes = True


# Room Event Log
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

