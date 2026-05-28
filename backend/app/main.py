import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine
from app.models import Base
from app.services.worker import worker_loop
from app.api.websocket import ws_broadcast_adapter
from app.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Create SQLite database tables
    Base.metadata.create_all(bind=engine)
    print("SQLite database tables created successfully.")
    
    # Start the async in-process background worker
    worker_task = asyncio.create_task(worker_loop(broadcast_callback=ws_broadcast_adapter))
    print("Background worker process spawned.")
    
    yield
    
    # Shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    print("Background worker shutdown cleanly.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-Time Creative Battle Platform Backend - Clean Architecture Edition",
    lifespan=lifespan
)

# CORS middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For standard local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include central modular API router
app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Prompt Arena API server."}
