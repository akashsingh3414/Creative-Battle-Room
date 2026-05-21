from sqlalchemy.orm import Session
from app.models import Round, Room

class RoundService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, room_id: str, prompt_theme: str) -> Round:
        # 1. Fetch current rounds count to compute round number
        count = self.db.query(Round).filter(Round.room_id == room_id).count()
        new_round_number = count + 1
        
        # 2. Update room status to active if not already
        room = self.db.query(Room).filter(Room.id == room_id).first()
        if room and room.status == "waiting":
            room.status = "active"
            
        db_round = Round(
            room_id=room_id,
            round_number=new_round_number,
            prompt_theme=prompt_theme,
            status="accepting_submissions"
        )
        self.db.add(db_round)
        self.db.commit()
        self.db.refresh(db_round)
        return db_round

    def get_active(self, room_id: str) -> Round | None:
        # Gets the latest active or evaluating round for a room
        return self.db.query(Round).filter(
            Round.room_id == room_id,
            Round.status.in_(["accepting_submissions", "evaluating"])
        ).order_by(Round.created_at.desc()).first()

    def get(self, round_id: str) -> Round | None:
        return self.db.query(Round).filter(Round.id == round_id).first()
