from datetime import datetime
from pydantic import BaseModel, Field
from .user import UserOut

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

class JobOut(BaseModel):
    id: str
    submission_id: str
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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
