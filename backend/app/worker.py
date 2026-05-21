import asyncio
import json
import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal
from .ai_provider import ai_provider, AIProviderError
from . import models

# In-process asynchronous task queue
generation_queue = asyncio.Queue()

async def worker_loop(broadcast_callback):
    """
    Background worker loop pulling job requests from generation_queue.
    Decoupled from WebSockets by accepting a broadcast_callback function:
    async def broadcast_callback(room_id: str, payload: dict) -> None
    """
    print("Background task worker loop started.")
    while True:
        job_request = await generation_queue.get()
        job_id = job_request.get("job_id")
        submission_id = job_request.get("submission_id")
        room_id = job_request.get("room_id")
        theme = job_request.get("theme")
        prompt = job_request.get("prompt")

        print(f"Worker picked up job {job_id} for submission {submission_id} in room {room_id}")
        
        # 1. Open a new database session
        db: Session = SessionLocal()
        try:
            # Fetch Job and Submission
            job = db.query(models.Job).filter(models.Job.id == job_id).first()
            submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()

            if not job or not submission:
                print(f"Error: Job {job_id} or Submission {submission_id} not found in database.")
                continue

            # 2. Update status to 'running'
            job.status = "running"
            job.updated_at = datetime.datetime.utcnow()
            db.commit()

            # Broadcast Running State
            await broadcast_callback(room_id, {
                "event_type": "JOB_STATUS_UPDATED",
                "payload": {
                    "job_id": job.id,
                    "submission_id": submission_id,
                    "status": "running",
                    "participant_id": submission.participant_id
                }
            })

            # 3. Call AI provider with timeout handling
            try:
                # 30 seconds timeout for AI generation
                campaign_data = await asyncio.wait_for(
                    ai_provider.generate_creative_campaign(theme, prompt),
                    timeout=30.0
                )

                # 4. Successful Generation
                job.status = "completed"
                job.updated_at = datetime.datetime.utcnow()
                
                # Persist output into submission
                submission.generated_content = json.dumps(campaign_data)
                # Set a high-quality visual description to show in UI
                submission.image_url = campaign_data.get("visual_prompt")
                db.commit()

                # Broadcast Completion
                await broadcast_callback(room_id, {
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

            except asyncio.TimeoutError:
                # 5. Handle Timeout
                job.status = "timed_out"
                job.error_message = "Generation timed out: The AI provider failed to respond within 30 seconds."
                job.updated_at = datetime.datetime.utcnow()
                db.commit()

                await broadcast_callback(room_id, {
                    "event_type": "JOB_STATUS_UPDATED",
                    "payload": {
                        "job_id": job.id,
                        "submission_id": submission.id,
                        "status": "timed_out",
                        "error_message": job.error_message,
                        "participant_id": submission.participant_id
                    }
                })

            except AIProviderError as e:
                # 6. Handle Known AI Failures
                job.status = "failed"
                job.error_message = str(e)
                job.updated_at = datetime.datetime.utcnow()
                db.commit()

                await broadcast_callback(room_id, {
                    "event_type": "JOB_STATUS_UPDATED",
                    "payload": {
                        "job_id": job.id,
                        "submission_id": submission.id,
                        "status": "failed",
                        "error_message": job.error_message,
                        "participant_id": submission.participant_id
                    }
                })

            except Exception as e:
                # 7. Handle Unanticipated Exceptions
                job.status = "failed"
                job.error_message = f"An unexpected system error occurred: {str(e)}"
                job.updated_at = datetime.datetime.utcnow()
                db.commit()

                await broadcast_callback(room_id, {
                    "event_type": "JOB_STATUS_UPDATED",
                    "payload": {
                        "job_id": job.id,
                        "submission_id": submission.id,
                        "status": "failed",
                        "error_message": job.error_message,
                        "participant_id": submission.participant_id
                    }
                })

        except Exception as db_err:
            print(f"Database error in background worker loop: {db_err}")
        finally:
            db.close()
            generation_queue.task_done()
