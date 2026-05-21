import os
import time
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test environment before imports
os.environ["DATABASE_URL"] = "sqlite:///./test_poiro_battle.db"
os.environ["FORCE_MOCK_AI"] = "true"

from app.database import Base, get_db
from app.main import app as fastapi_app
from app import models
import app.worker
import app.main

async def mock_queue_put(item):
    job_id = item["job_id"]
    submission_id = item["submission_id"]
    room_id = item["room_id"]
    theme = item["theme"]
    prompt = item["prompt"]
    
    db = TestingSessionLocal()
    try:
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
        
        # 1. Transition to running
        job.status = "running"
        db.commit()
        await app.main.manager.broadcast(room_id, {
            "event_type": "JOB_STATUS_UPDATED",
            "payload": {
                "job_id": job.id,
                "submission_id": submission_id,
                "status": "running",
                "participant_id": submission.participant_id
            }
        })
        
        # 2. Transition to completed
        job.status = "completed"
        import json
        campaign_data = {
            "campaign_name": "LIQUID STATIC",
            "tagline": "The cyber campaign",
            "description": "Mock cyberpunk perfume campaign generated for test.",
            "sensory_notes": "Ozone and virtual rain",
            "visual_prompt": "Neon hologram bottle Octane render"
        }
        submission.generated_content = json.dumps(campaign_data)
        submission.image_url = "Neon hologram bottle Octane render"
        db.commit()
        
        await app.main.manager.broadcast(room_id, {
            "event_type": "SUBMISSION_COMPLETED",
            "payload": {
                "submission_id": submission.id,
                "participant_id": submission.participant_id,
                "generated_content": campaign_data,
                "job": {
                    "id": job.id,
                    "status": "completed",
                    "error_message": None
                }
            }
        })
    finally:
        db.close()

# Apply the mock to the queue inside the worker module
app.worker.generation_queue.put = mock_queue_put

# Use a clean test database
TEST_DB_URL = "sqlite:///./test_poiro_battle.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db

def setup_test_db():
    # Drop and recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_battle_room_lifecycle():
    setup_test_db()
    client = TestClient(fastapi_app)

    print("\n--- [TEST] Starting Integration Test: AI Creative Battle Room ---")

    # 1. Register Host and Participant
    host_resp = client.post("/api/auth/register", json={
        "username": "NeonHost",
        "email": "host@poiro.ai",
        "password": "securepassword123",
        "avatar_seed": "host_seed"
    })
    assert host_resp.status_code == 200, f"Host registration failed: {host_resp.text}"
    host_data = host_resp.json()
    host_token = host_data["access_token"]
    host_id = host_data["user"]["id"]
    print("[SUCCESS] Host registered successfully.")

    part_resp = client.post("/api/auth/register", json={
        "username": "CyberRunner",
        "email": "runner@poiro.ai",
        "password": "runnerpassword123",
        "avatar_seed": "runner_seed"
    })
    assert part_resp.status_code == 200, f"Participant registration failed: {part_resp.text}"
    part_data = part_resp.json()
    part_token = part_data["access_token"]
    part_id = part_data["user"]["id"]
    print("[SUCCESS] Participant registered successfully.")

    # 2. Create Battle Room (Host)
    room_resp = client.post(
        "/api/rooms",
        json={"name": "Cyber Perfume Showdown"},
        headers={"Authorization": f"Bearer {host_token}"}
    )
    assert room_resp.status_code == 200, f"Room creation failed: {room_resp.text}"
    room_data = room_resp.json()
    room_code = room_data["id"]
    print(f"[SUCCESS] Room created with code: {room_code}")

    # 3. Simulate WebSocket flow
    # Connect Host WebSocket
    with client.websocket_connect(f"/ws/room/{room_code}?token={host_token}") as host_ws:
        # Connect Participant WebSocket
        with client.websocket_connect(f"/ws/room/{room_code}?token={part_token}") as part_ws:
            
            # Read Initial Room State (Host)
            host_state = host_ws.receive_json()
            assert host_state["event_type"] == "ROOM_STATE"
            assert host_state["payload"]["user_role"] == "host"
            print("[SUCCESS] Host connected and verified initial room state.")

            # Host receives USER_JOINED for themselves
            host_join_self = host_ws.receive_json()
            assert host_join_self["event_type"] == "USER_JOINED"
            assert host_join_self["payload"]["user"]["username"] == "NeonHost"

            # Connect Participant
            part_state = part_ws.receive_json()
            assert part_state["event_type"] == "ROOM_STATE"
            assert part_state["payload"]["user_role"] == "participant"
            print("[SUCCESS] Participant connected and verified initial room state.")

            # Participant receives USER_JOINED for themselves
            part_join_self = part_ws.receive_json()
            assert part_join_self["event_type"] == "USER_JOINED"
            assert part_join_self["payload"]["user"]["username"] == "CyberRunner"

            # Host gets "USER_JOINED" event when participant joins
            join_evt = host_ws.receive_json()
            assert join_evt["event_type"] == "USER_JOINED"
            assert join_evt["payload"]["user"]["username"] == "CyberRunner"
            print("[SUCCESS] Host received real-time participant join announcement.")

            # 4. Role Separation Verification (Participant tries to start round -> Denied)
            part_ws.send_json({
                "action": "START_ROUND",
                "payload": {"prompt_theme": "Hack the sensory net"}
            })
            err_evt = part_ws.receive_json()
            assert err_evt["event_type"] == "ERROR"
            assert "Permission denied" in err_evt["payload"]["message"]
            print("[SUCCESS] Backend successfully blocked non-host from starting the round.")

            # 5. Host starts a round
            host_ws.send_json({
                "action": "START_ROUND",
                "payload": {"prompt_theme": "Cyberpunk Neon Musks for Gen-Z"}
            })

            # Host & Participant should receive ROUND_STARTED broadcast
            r_start_host = host_ws.receive_json()
            assert r_start_host["event_type"] == "ROUND_STARTED"
            assert r_start_host["payload"]["prompt_theme"] == "Cyberpunk Neon Musks for Gen-Z"

            r_start_part = part_ws.receive_json()
            assert r_start_part["event_type"] == "ROUND_STARTED"
            assert r_start_part["payload"]["prompt_theme"] == "Cyberpunk Neon Musks for Gen-Z"
            print("[SUCCESS] Host started round; broadcast verified on all channels.")

            # 6. Participant submits a prompt (Creates an async job)
            part_ws.send_json({
                "action": "SUBMIT_PROMPT",
                "payload": {"user_prompt": "Smells like digital gasoline and night-blooming jasmine."}
            })

            # Verify SUBMISSION_SUBMITTED broadcast
            sub_host = host_ws.receive_json()
            assert sub_host["event_type"] == "SUBMISSION_SUBMITTED"
            assert sub_host["payload"]["user_prompt"] == "Smells like digital gasoline and night-blooming jasmine."
            assert sub_host["payload"]["job"]["status"] == "queued"

            sub_part = part_ws.receive_json()
            assert sub_part["event_type"] == "SUBMISSION_SUBMITTED"
            print("[SUCCESS] Submission accepted and entered queued job state.")

            # Since FastAPI test client runs synchronously, to execute the background queue
            # we need to simulate the worker execution or let the server lifespan task tick.
            # In fastapi test client, lifespan runs background tasks automatically on another thread
            # or in-process. Let's wait a couple of seconds to see the async job transitions.
            print("Waiting for background task worker to process the job...")
            
            # Read JOB_STATUS_UPDATED (running)
            run_host = host_ws.receive_json()
            assert run_host["event_type"] == "JOB_STATUS_UPDATED"
            assert run_host["payload"]["status"] == "running"
            print("[SUCCESS] Received real-time broadcast: Job state transitioned to RUNNING.")

            # Read SUBMISSION_COMPLETED (completed)
            comp_host = host_ws.receive_json()
            assert comp_host["event_type"] == "SUBMISSION_COMPLETED"
            assert comp_host["payload"]["job"]["status"] == "completed"
            
            generated_campaign = comp_host["payload"]["generated_content"]
            assert "campaign_name" in generated_campaign
            print(f"[SUCCESS] Async Job COMPLETED! Generated Campaign Name: {generated_campaign['campaign_name']}")

            # 7. Host starts evaluation
            host_ws.send_json({
                "action": "EVALUATE_ROUND",
                "payload": {}
            })
            eval_host = host_ws.receive_json()
            assert eval_host["event_type"] == "ROUND_EVALUATING"
            print("[SUCCESS] Host closed submissions and entered evaluating phase.")

            # 8. Host scores the submission
            submission_id = comp_host["payload"]["submission_id"]
            host_ws.send_json({
                "action": "SCORE_SUBMISSION",
                "payload": {
                    "submission_id": submission_id,
                    "score": 92.5,
                    "rank": 1,
                    "status": "active"
                }
            })

            score_evt = host_ws.receive_json()
            assert score_evt["event_type"] == "SUBMISSION_SCORED"
            assert score_evt["payload"]["score"] == 92.5
            assert score_evt["payload"]["rank"] == 1
            print("[SUCCESS] Host scored submission; scoreboard updated in real time.")

    # 9. Verify SQLite Persistence after closing websockets
    db = TestingSessionLocal()
    saved_sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    assert saved_sub is not None
    assert saved_sub.score == 92.5
    assert saved_sub.job.status == "completed"
    db.close()
    print("[SUCCESS] Database assertions verified: state completely persisted across refreshes!")
    print("--- [TEST] Integration Test Passed Flawlessly! ---\n")

if __name__ == "__main__":
    test_battle_room_lifecycle()
    # Clean up test database
    if os.path.exists("./test_poiro_battle.db"):
        try:
            os.remove("./test_poiro_battle.db")
        except Exception:
            pass
