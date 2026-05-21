from fastapi import APIRouter
from .auth import router as auth_router
from .rooms import router as rooms_router
from .history import router as history_router
from .websocket import router as websocket_router

api_router = APIRouter()

# Register sub-routers
api_router.include_router(auth_router, prefix="/api")
api_router.include_router(rooms_router, prefix="/api")
api_router.include_router(history_router, prefix="/api")
api_router.include_router(websocket_router)  # Handles /ws/room/{room_code}
