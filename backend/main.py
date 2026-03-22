from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from ingestion_loop import ingestion_loop, is_paused, set_paused
from mock_data import STUDENTS, reset_to_original
from risk_model import load_model, update_student_risk
from websocket_manager import manager

from routers.auth import router as auth_router
from routers.students import router as students_router
from routers.events import router as events_router
from routers.risk import router as risk_router
from routers.generate import router as generate_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-5s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("flare.main")

_ingestion_task: asyncio.Task[None] | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ingestion_task

    logger.info("Loading risk model...")
    load_model()

    # ── Database initialization ────────────────────────────────────
    # Creates all ORM tables on first run. In demo mode (sqlite:///:memory:)
    # the database resets on every restart — intentional for rehearsals.
    from database import engine, SessionLocal
    from database import Base
    import db_models  # registers all ORM table classes with Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")

    # Seed student records into the database if it's empty
    from db_models import StudentRecord, CourseRecord, AssignmentRecord
    db = SessionLocal()
    try:
        if db.query(StudentRecord).count() == 0:
            for s in STUDENTS:
                db.add(StudentRecord(
                    id=s["id"], name=s["name"], email=s["email"],
                    major=s["major"], year=s["year"], gpa=s["gpa"],
                    advisor_id=s["advisor_id"],
                    avatar_initials=s["avatar_initials"],
                ))
                for c in s["courses"]:
                    db.add(CourseRecord(
                        id=c["id"], student_id=s["id"],
                        name=c["name"], code=c["code"],
                        credits=c["credits"],
                        current_grade=c["current_grade"],
                        instructor=c["instructor"],
                    ))
                    for a in c["assignments"]:
                        db.add(AssignmentRecord(
                            id=a["id"], course_id=c["id"],
                            title=a["title"], due_date=a["due_date"],
                            submitted=a["submitted"],
                            grade=a.get("grade"),
                            points_possible=a["points_possible"],
                        ))
            db.commit()
            logger.info("Seeded %d students into database.", len(STUDENTS))
    except Exception as e:
        logger.error("DB seed error: %s", e)
    finally:
        db.close()

    logger.info("")
    logger.info("=" * 62)
    logger.info("  FLARE v2.0  |  Initial Risk Assessment")
    logger.info("=" * 62)
    logger.info(f"  {'Name':<22} {'Score':>6}  {'Level':<10}  {'7d Proj':>7}  {'Trend'}")
    logger.info("-" * 62)

    for student in STUDENTS:
        update_student_risk(student)
        proj = student.get("projected_score_7d")
        proj_str = f"{proj:>6.1f}" if proj is not None else "   N/A"
        logger.info(
            f"  {student['name']:<22} {student['risk_score']:>5.1f}  "
            f"{student['risk_level']:<10}  {proj_str}  {student.get('trend','')}"
        )

    logger.info("=" * 62)
    logger.info(f"  {len(STUDENTS)} students initialized.")
    logger.info("")

    _ingestion_task = asyncio.create_task(_run_ingestion())
    logger.info("Ingestion loop started (30s interval).")
    logger.info("Flare API ready.")

    yield

    if _ingestion_task:
        _ingestion_task.cancel()
        try:
            await _ingestion_task
        except asyncio.CancelledError:
            pass
    logger.info("Flare API shutdown complete.")


async def _run_ingestion() -> None:
    await ingestion_loop(interval_seconds=30)


app = FastAPI(title="Flare API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(events_router)
app.include_router(risk_router)
app.include_router(generate_router)


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "status":        "operational",
        "version":       "2.0.0",
        "student_count": len(STUDENTS),
        "model_info": {
            "type":             "GradientBoostingClassifier",
            "features":         7,
            "training_samples": 3000,
            "test_auc":         "~0.80",
            "loaded_from_disk": True,
        },
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    from risk_model import MODEL
    return {
        "status":          "healthy",
        "model_loaded":    MODEL is not None,
        "students_loaded": len(STUDENTS),
        "ws_connections":  manager.connection_count,
        "ingestion_loop":  "paused" if is_paused() else "active",
        "timestamp":       datetime.now(timezone.utc).isoformat(),
    }


@app.post("/demo/reset")
async def demo_reset() -> Dict[str, Any]:
    reset_to_original()
    for student in STUDENTS:
        update_student_risk(student)
    await manager.broadcast({
        "type":      "system_reset",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "message":   "System reset to baseline state",
    })
    return {"status": "reset_complete", "student_count": len(STUDENTS)}


@app.post("/demo/pause-ingestion")
async def pause_ingestion() -> Dict[str, Any]:
    set_paused(True)
    return {"paused": True}


@app.post("/demo/resume-ingestion")
async def resume_ingestion() -> Dict[str, Any]:
    set_paused(False)
    return {"paused": False}


@app.get("/demo/ingestion-status")
async def ingestion_status() -> Dict[str, Any]:
    return {"paused": is_paused()}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
