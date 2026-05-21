import asyncio
import json
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import security
from app.services.room_service import RoomService
from app.services.round_service import RoundService
from app.services.submission_service import SubmissionService
from app.models import Room, User, Submission, Job
from app.services.worker import generation_queue

router = APIRouter(prefix="/ws", tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        # Map room_id -> list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Map room_id -> Dict of user_id -> user_data
        self.room_users: Dict[str, Dict[str, dict]] = {}
        # Map websocket -> (room_id, user_id)
        self.socket_info: Dict[WebSocket, tuple] = {}

    async def connect(self, room_id: str, websocket: WebSocket, user_info: dict):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        
        if room_id not in self.room_users:
            self.room_users[room_id] = {}
        
        user_id = str(user_info["id"])
        self.room_users[room_id][user_id] = user_info
        self.socket_info[websocket] = (room_id, user_id)
        print(f"WS Client connected to room {room_id}. Total active connections: {len(self.active_connections[room_id])}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.socket_info:
            room_id, user_id = self.socket_info[websocket]
            del self.socket_info[websocket]
            
            if room_id in self.active_connections:
                if websocket in self.active_connections[room_id]:
                    self.active_connections[room_id].remove(websocket)
                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]
            
            # Check if user has other connections open for this room (multi-tab)
            still_connected = False
            for ws, (r_id, u_id) in self.socket_info.items():
                if r_id == room_id and u_id == user_id:
                    still_connected = True
                    break
            
            if not still_connected and room_id in self.room_users:
                if user_id in self.room_users[room_id]:
                    del self.room_users[room_id][user_id]
                if not self.room_users[room_id]:
                    del self.room_users[room_id]
            print(f"WS Client disconnected. Rooms active: {list(self.active_connections.keys())}")

    def get_room_users(self, room_id: str) -> List[dict]:
        if room_id in self.room_users:
            return list(self.room_users[room_id].values())
        return []

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
    db = next(get_db())
    try:
        room_service = RoomService(db)
        room_service.create_event(room_id, payload_event["event_type"], payload_event["payload"])
    except Exception as e:
        print(f"Failed to persist room event log: {e}")
    finally:
        db.close()
        
    await manager.broadcast(room_id, payload_event)


@router.websocket("/room/{room_code}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_code: str,
    token: str | None = None,
    db: Session = Depends(get_db)
):
    # Instantiate services
    room_service = RoomService(db)
    round_service = RoundService(db)
    submission_service = SubmissionService(db)

    # 2. Extract Token and Authenticate User
    if not token:
        await websocket.accept()
        await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Authentication token query parameter is missing."}})
        await websocket.close()
        return

    user = security.get_user_from_token(token, db)
    if not user:
        await websocket.accept()
        await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Invalid or expired session token."}})
        await websocket.close()
        return

    # 3. Check if Room Exists
    room = db.query(Room).filter(Room.id == room_code).first()
    if not room:
        await websocket.accept()
        await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Room not found."}})
        await websocket.close()
        return

    # 4. Accept connection and group in ConnectionManager
    role = "host" if user.id == room.host_id else "participant"
    user_info = {
        "id": user.id,
        "username": user.username,
        "avatar_seed": user.avatar_seed,
        "role": role
    }
    # Persist the connection history for this user in SQLite
    room_service.add_history(user.id, room.id, role)
    await manager.connect(room_code, websocket, user_info)

    try:
        # 5. Send initial Room State to the connecting user
        active_round = round_service.get_active(room_code)
        
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
            "active_round": None,
            "users": manager.get_room_users(room_code)
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
                "user": user_info,
                "role": "host" if user.id == room.host_id else "participant",
                "users": manager.get_room_users(room_code)
            }
        })

        # 6. Listen for incoming WebSocket messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("action")
            payload = message.get("payload", {})

            db.refresh(room)
            db.refresh(user)

            # A. START_ROUND (Host only)
            if action == "START_ROUND":
                if user.id != room.host_id:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Permission denied: Only the room host can start a round."}})
                    continue

                # Ensure no other active round is open
                active = round_service.get_active(room_code)
                if active:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "An active round is already in progress."}})
                    continue

                prompt_theme = payload.get("prompt_theme", "Generate an insane luxury cyberpunk perfume campaign.")
                new_round = round_service.create(room_code, prompt_theme)
                
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

                active_round = round_service.get_active(room_code)
                if not active_round or active_round.status != "accepting_submissions":
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Submissions are closed: No active round is currently accepting entries."}})
                    continue

                # Check if participant already submitted for this round
                existing = db.query(Submission).filter(
                    Submission.round_id == active_round.id,
                    Submission.participant_id == user.id
                ).first()
                if existing:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Multiple submissions blocked: You have already submitted a prompt for this round."}})
                    continue

                user_prompt = payload.get("user_prompt", "").strip()
                if not user_prompt:
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Invalid prompt: Submissions cannot be blank."}})
                    continue

                # Create submission and associated job in database
                submission, job = submission_service.create(active_round.id, user.id, user_prompt)
                
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

                # Queue the job for async worker execution
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

                active_round = round_service.get_active(room_code)
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

                active_round = round_service.get_active(room_code)
                if not active_round or active_round.status != "evaluating":
                    await websocket.send_json({"event_type": "ERROR", "payload": {"message": "Permission denied: Submissions can only be scored during the evaluation phase."}})
                    continue

                sub_id = payload.get("submission_id")
                score = float(payload.get("score", 0))
                rank = payload.get("rank")
                status_str = payload.get("status", "active")  # "active" or "eliminated"

                scored_sub = submission_service.score(sub_id, score, rank, status_str)
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

                active_round = round_service.get_active(room_code)
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
        manager.disconnect(websocket)
        await manager.broadcast(room_code, {
            "event_type": "USER_LEFT",
            "payload": {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "avatar_seed": user.avatar_seed
                },
                "users": manager.get_room_users(room_code)
            }
        })
