import asyncio
import json
from contextlib import asynccontextmanager
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, get_db
from . import models, schemas, crud, security
from .worker import worker_loop, generation_queue

# Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        # Map room_id -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        print(f"WS Client connected to room {room_id}. Total active: {len(self.active_connections[room_id])}")

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        print(f"WS Client disconnected. Rooms active: {list(self.active_connections.keys())}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, room_id: str, message: dict):
        if room_id in self.active_connections:
            # Broadcast to all clients in the room safely
            for connection in list(self.active_connections[room_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    # connection might be dead, discard silently
                    pass

manager = ConnectionManager()

async def ws_broadcast_adapter(room_id: str, payload_event: dict):
    """Adapter to pass manager.broadcast to worker loop"""
    # Also log event in database for audit trail (Event Sourcing optional enhancement!)
    db = next(get_db())
    try:
        crud.create_room_event(db, room_id, payload_event["event_type"], payload_event["payload"])
    except Exception as e:
        print(f"Failed to persist room event log: {e}")
    finally:
        db.close()
        
    await manager.broadcast(room_id, payload_event)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Create SQLite database tables
    models.Base.metadata.create_all(bind=engine)
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
    description="Real-Time Creative Battle Platform Backend",
    lifespan=lifespan
)

# CORS middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For standard local intern task development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# REST API HTTP ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {"message": "Welcome to the Poiro Creative Battle Room API server."}

# Auth Routes
@app.post("/api/auth/register", response_model=schemas.Token)
def register(user_schema: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user_schema.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    user = crud.create_user(db, user_schema)
    access_token = security.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(login_schema: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, login_schema.email)
    if not user or not security.verify_password(login_schema.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email credentials or password."
        )
    access_token = security.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.get("/api/auth/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user


# Room Routes
@app.post("/api/rooms", response_model=schemas.RoomOut)
def create_new_room(
    room_schema: schemas.RoomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    room = crud.create_room(db, room_schema.name, current_user.id)
    return room

@app.get("/api/rooms/{room_id}", response_model=schemas.RoomOut)
def get_room_details(room_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    room = crud.get_room(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested room does not exist."
        )
    return room


# ==========================================
# WEBSOCKET REAL-TIME ENDPOINT
# ==========================================

@app.websocket("/ws/room/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, token: str | None = None):
    # 1. Resolve SQLite Database Session
    db: Session = next(get_db())
    
    # 2. Extract Token and Authenticate User
    if not token:
        await websocket.accept()
        await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Authentication token query parameter is missing."}})
        await websocket.close()
        db.close()
        return

    user = security.get_user_from_token(token, db)
    if not user:
        await websocket.accept()
        await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Invalid or expired session token."}})
        await websocket.close()
        db.close()
        return

    # 3. Check if Room Exists
    room = crud.get_room(db, room_code)
    if not room:
        await websocket.accept()
        await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Room not found."}})
        await websocket.close()
        db.close()
        return

    # 4. Accept connection and group in ConnectionManager
    await manager.connect(room_code, websocket)

    try:
        # 5. Send initial Room State to the connecting user
        # This handles reconnects and page refreshes cleanly without losing state!
        active_round = crud.get_active_round(db, room_code)
        
        initial_state = {
            "room_id": room.id,
            "room_name": room.name,
            "room_status": room.status,
            "host": {
                "id": room.host.id,
                "username": room.host.username,
                "avatar_seed": room.host.avatar_seed
            },
            "user_role": "host" if user.id == room.host_id else "participant",
            "active_round": None
        }

        if active_round:
            # Serialize submissions in the active round
            submissions_list = []
            for sub in active_round.submissions:
                campaign_data = None
                if sub.generated_content:
                    try:
                        campaign_data = json.loads(sub.generated_content)
                    except Exception:
                        campaign_data = sub.generated_content

                submissions_list.append({
                    "id": sub.id,
                    "participant": {
                        "id": sub.participant.id,
                        "username": sub.participant.username,
                        "avatar_seed": sub.participant.avatar_seed
                    },
                    "user_prompt": sub.user_prompt,
                    "generated_content": campaign_data,
                    "image_url": sub.image_url,
                    "score": sub.score,
                    "rank": sub.rank,
                    "status": sub.status,
                    "job": {
                        "id": sub.job.id if sub.job else None,
                        "status": sub.job.status if sub.job else None,
                        "error_message": sub.job.error_message if sub.job else None
                    }
                })

            initial_state["active_round"] = {
                "id": active_round.id,
                "round_number": active_round.round_number,
                "prompt_theme": active_round.prompt_theme,
                "status": active_round.status,
                "submissions": submissions_list
            }

        # Send unicast message
        await manager.send_personal_message({
            "event_type": "ROOM_STATE",
            "payload": initial_state
        }, websocket)

        # Broadcast User Joined
        await manager.broadcast(room_code, {
            "event_type": "USER_JOINED",
            "payload": {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "avatar_seed": user.avatar_seed
                },
                "role": "host" if user.id == room.host_id else "participant"
            }
        })

        # 6. Listen for incoming WebSocket messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("action")
            payload = message.get("payload", {})

            # Refetch room and user from database in case of updates in previous turns
            db.refresh(room)
            db.refresh(user)

            # --- ACTION HANDLERS ---

            # A. START_ROUND (Host only)
            if action == "START_ROUND":
                if user.id != room.host_id:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Permission denied: Only the room host can start a round."}})
                    continue

                # Ensure no other active round is open
                active = crud.get_active_round(db, room_code)
                if active:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "An active round is already in progress."}})
                    continue

                prompt_theme = payload.get("prompt_theme", "Generate an insane luxury cyberpunk perfume campaign.")
                new_round = crud.create_round(db, room_code, prompt_theme)
                
                await manager.broadcast(room_code, {
                    "event_type": "ROUND_STARTED",
                    "payload": {
                        "id": new_round.id,
                        "round_number": new_round.round_number,
                        "prompt_theme": new_round.prompt_theme,
                        "status": new_round.status,
                        "submissions": []
                    }
                })

            # B. SUBMIT_PROMPT (Participant only)
            elif action == "SUBMIT_PROMPT":
                if user.id == room.host_id:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Host exception: The host is not allowed to participate as a contestant."}})
                    continue

                active_round = crud.get_active_round(db, room_code)
                if not active_round or active_round.status != "accepting_submissions":
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Submissions are closed: No active round is currently accepting entries."}})
                    continue

                # Check if participant already submitted for this round
                existing = db.query(models.Submission).filter(
                    models.Submission.round_id == active_round.id,
                    models.Submission.participant_id == user.id
                ).first()
                if existing:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Multiple submissions blocked: You have already submitted a prompt for this round."}})
                    continue

                user_prompt = payload.get("user_prompt", "").strip()
                if not user_prompt:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Invalid prompt: Submissions cannot be blank."}})
                    continue

                # Create submission and associated job in database
                submission, job = crud.create_submission(db, active_round.id, user.id, user_prompt)
                
                # Broadcast new submission to room so everyone sees it is queued!
                await manager.broadcast(room_code, {
                    "event_type": "SUBMISSION_SUBMITTED",
                    "payload": {
                        "id": submission.id,
                        "participant": {
                            "id": user.id,
                            "username": user.username,
                            "avatar_seed": user.avatar_seed
                        },
                        "user_prompt": submission.user_prompt,
                        "generated_content": None,
                        "image_url": None,
                        "score": None,
                        "rank": None,
                        "status": submission.status,
                        "job": {
                            "id": job.id,
                            "status": job.status,
                            "error_message": None
                        }
                    }
                })

                # Queue the job for async worker execution (Non-blocking REST or WS thread!)
                await generation_queue.put({
                    "job_id": job.id,
                    "submission_id": submission.id,
                    "room_id": room_code,
                    "theme": active_round.prompt_theme,
                    "prompt": user_prompt
                })

            # C. EVALUATE_ROUND (Host only)
            elif action == "EVALUATE_ROUND":
                if user.id != room.host_id:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Permission denied: Only the room host can lock submissions and start evaluation."}})
                    continue

                active_round = crud.get_active_round(db, room_code)
                if not active_round or active_round.status != "accepting_submissions":
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "No active round is currently open for submissions."}})
                    continue

                active_round.status = "evaluating"
                db.commit()

                await manager.broadcast(room_code, {
                    "event_type": "ROUND_EVALUATING",
                    "payload": {
                        "round_id": active_round.id,
                        "status": "evaluating"
                    }
                })

            # D. SCORE_SUBMISSION (Host only)
            elif action == "SCORE_SUBMISSION":
                if user.id != room.host_id:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Permission denied: Only the host can score submissions."}})
                    continue

                active_round = crud.get_active_round(db, room_code)
                if not active_round or active_round.status != "evaluating":
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Permission denied: Submissions can only be scored during the evaluation phase."}})
                    continue

                sub_id = payload.get("submission_id")
                score = float(payload.get("score", 0))
                rank = payload.get("rank")
                status_str = payload.get("status", "active")  # "active" or "eliminated"

                scored_sub = crud.score_submission(db, sub_id, score, rank, status_str)
                if scored_sub:
                    await manager.broadcast(room_code, {
                        "event_type": "SUBMISSION_SCORED",
                        "payload": {
                            "submission_id": scored_sub.id,
                            "score": scored_sub.score,
                            "rank": scored_sub.rank,
                            "status": scored_sub.status
                        }
                    })

            # E. COMPLETE_ROUND (Host only)
            elif action == "COMPLETE_ROUND":
                if user.id != room.host_id:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Permission denied: Only the host can finalize the round."}})
                    continue

                active_round = crud.get_active_round(db, room_code)
                if not active_round:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "No active round to complete."}})
                    continue

                active_round.status = "completed"
                db.commit()

                await manager.broadcast(room_code, {
                    "event_type": "ROUND_COMPLETED",
                    "payload": {
                        "round_id": active_round.id,
                        "status": "completed"
                    }
                })

            # F. REVEAL_WINNER / END_BATTLE (Host only)
            elif action == "END_BATTLE":
                if user.id != room.host_id:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Permission denied: Only the host can end the battle."}})
                    continue

                room.status = "completed"
                db.commit()

                await manager.broadcast(room_code, {
                    "event_type": "BATTLE_COMPLETED",
                    "payload": {
                        "room_id": room_code,
                        "status": "completed"
                    }
                })

    except WebSocketDisconnect:
        manager.disconnect(room_code, websocket)
        await manager.broadcast(room_code, {
            "event_type": "USER_LEFT",
            "payload": {
                "user_id": user.id,
                "username": user.username
            }
        })
    finally:
        db.close()
