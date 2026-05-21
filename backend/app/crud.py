import random
import string
import json
import datetime
from sqlalchemy.orm import Session
from . import models, schemas, security

def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: str) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user_schema: schemas.UserCreate) -> models.User:
    hashed_pw = security.get_password_hash(user_schema.password)
    db_user = models.User(
        username=user_schema.username,
        email=user_schema.email,
        hashed_password=hashed_pw,
        avatar_seed=user_schema.avatar_seed or f"avatar_{random.randint(1, 1000)}"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def generate_room_code(db: Session) -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choice(chars) for _ in range(5))
        exists = db.query(models.Room).filter(models.Room.id == code).first()
        if not exists:
            return code

def create_room(db: Session, name: str, host_id: str) -> models.Room:
    room_code = generate_room_code(db)
    db_room = models.Room(
        id=room_code,
        name=name,
        host_id=host_id,
        status="waiting"
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

def get_room(db: Session, room_id: str) -> models.Room | None:
    return db.query(models.Room).filter(models.Room.id == room_id).first()

def create_round(db: Session, room_id: str, prompt_theme: str) -> models.Round:
    # 1. Fetch current rounds count to compute round number
    count = db.query(models.Round).filter(models.Round.room_id == room_id).count()
    new_round_number = count + 1
    
    # 2. Update room status to active if not already
    room = get_room(db, room_id)
    if room and room.status == "waiting":
        room.status = "active"
        
    db_round = models.Round(
        room_id=room_id,
        round_number=new_round_number,
        prompt_theme=prompt_theme,
        status="accepting_submissions"
    )
    db.add(db_round)
    db.commit()
    db.refresh(db_round)
    return db_round

def get_active_round(db: Session, room_id: str) -> models.Round | None:
    # Gets the latest active or evaluating round for a room
    return db.query(models.Round).filter(
        models.Round.room_id == room_id,
        models.Round.status.in_(["accepting_submissions", "evaluating"])
    ).order_by(models.Round.created_at.desc()).first()

def get_round(db: Session, round_id: str) -> models.Round | None:
    return db.query(models.Round).filter(models.Round.id == round_id).first()

def create_submission(db: Session, round_id: str, participant_id: str, user_prompt: str) -> tuple[models.Submission, models.Job]:
    # 1. Create Submission
    db_sub = models.Submission(
        round_id=round_id,
        participant_id=participant_id,
        user_prompt=user_prompt,
        status="active"
    )
    db.add(db_sub)
    db.flush()  # Allocate ID
    
    # 2. Create Job
    db_job = models.Job(
        submission_id=db_sub.id,
        status="queued"
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_sub)
    db.refresh(db_job)
    return db_sub, db_job

def get_submission(db: Session, submission_id: str) -> models.Submission | None:
    return db.query(models.Submission).filter(models.Submission.id == submission_id).first()

def score_submission(db: Session, submission_id: str, score: float, rank: int | None, status: str) -> models.Submission | None:
    sub = get_submission(db, submission_id)
    if not sub:
        return None
    sub.score = score
    sub.rank = rank
    sub.status = status
    db.commit()
    db.refresh(sub)
    return sub

def create_room_event(db: Session, room_id: str, event_type: str, payload_data: dict) -> models.RoomEvent:
    db_event = models.RoomEvent(
        room_id=room_id,
        event_type=event_type,
        payload=json.dumps(payload_data)
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event
