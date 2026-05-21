from sqlalchemy.orm import Session
from app.models import Submission, Job

class SubmissionService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, round_id: str, participant_id: str, user_prompt: str) -> tuple[Submission, Job]:
        # 1. Create Submission
        db_sub = Submission(
            round_id=round_id,
            participant_id=participant_id,
            user_prompt=user_prompt,
            status="active"
        )
        self.db.add(db_sub)
        self.db.flush()  # Allocate ID
        
        # 2. Create Job
        db_job = Job(
            submission_id=db_sub.id,
            status="queued"
        )
        self.db.add(db_job)
        self.db.commit()
        self.db.refresh(db_sub)
        self.db.refresh(db_job)
        return db_sub, db_job

    def get(self, submission_id: str) -> Submission | None:
        return self.db.query(Submission).filter(Submission.id == submission_id).first()

    def score(self, submission_id: str, score: float, rank: int | None, status: str) -> Submission | None:
        sub = self.get(submission_id)
        if not sub:
            return None
        sub.score = score
        sub.rank = rank
        sub.status = status
        self.db.commit()
        self.db.refresh(sub)
        return sub
