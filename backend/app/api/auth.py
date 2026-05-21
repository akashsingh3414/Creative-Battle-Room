from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas import Token, UserCreate, UserLogin, UserOut
from app.services.user_service import UserService
from app.core import security
from app.core.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token)
def register(user_schema: UserCreate, db: Session = Depends(get_db)):
    user_service = UserService(db)
    db_user = user_service.get_by_email(user_schema.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    user = user_service.create(user_schema)
    access_token = security.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=Token)
def login(login_schema: UserLogin, db: Session = Depends(get_db)):
    user_service = UserService(db)
    user = user_service.get_by_email(login_schema.email)
    if not user or not security.verify_password(login_schema.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email credentials or password."
        )
    access_token = security.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(security.get_current_user)):
    return current_user
