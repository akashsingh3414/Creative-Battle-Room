import random
from sqlalchemy.orm import Session
from app.models import User
from app.schemas import UserCreate
from app.core import security

class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def create(self, user_schema: UserCreate) -> User:
        hashed_pw = security.get_password_hash(user_schema.password)
        db_user = User(
            username=user_schema.username,
            email=user_schema.email,
            hashed_password=hashed_pw,
            avatar_seed=user_schema.avatar_seed or f"avatar_{random.randint(1, 1000)}"
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
