from __future__ import annotations

import asyncio
import logging
import random
import time
from datetime import datetime, timezone

logger = logging.getLogger("flare.ingestion")

_paused = False


def is_paused() -> bool:
    return _paused


def set_paused(value: bool) -> None:
    global _paused
    _paused = value


async def poll_lms(student: dict) -> dict | None:
    """
    Simulates polling an LMS API for new submission state changes.

    In demo mode this randomly generates events with ~4% probability
    per student per 30-second cycle (giving ~28% chance of at least
    one event across 8 students each cycle).

    In production, this would be replaced with:
      Canvas:      GET /api/v1/courses/:id/submissions
      Brightspace: GET /d2l/api/le/1.9/:courseId/dropbox/folders/:id/submissions

    See canvas_client.py and brightspace_client.py for exact endpoints.
    """
    await asyncio.sleep(0.02)  # simulate network latency

    # Time-seeded RNG so each cycle produces different results
    rng = random.Random(time.time() + hash(student["id"]))

    # 4% chance per student per 30s cycle
    # With 8 students: ~28% chance of at least one event per cycle
    # Expected first event: ~2 cycles = ~60 seconds into demo
    if rng.random() > 0.04:
        return None

    now = datetime.now(timezone.utc)
    for course in student.get("courses", []):
        for assignment in course.get("assignments", []):
            try:
                due = datetime.fromisoformat(
                    assignment["due_date"].replace("Z", "+00:00")
                )
                if due < now and not assignment.get("submitted", False):
                    return {
                        "student_id":       student["id"],
                        "course_id":        course["id"],
                        "course_name":      course["name"],
                        "assignment_id":    assignment["id"],
                        "assignment_title": assignment["title"],
                    }
            except Exception:
                continue
    return None


async def ingestion_loop(interval_seconds: int = 30) -> None:
    """
    Autonomous background task.
    Simulates polling the LMS for new submission status changes.
    Runs forever as an asyncio task started on app startup.
    """
    # Import inside function to avoid circular import issues
    from mock_data import STUDENTS
    from risk_model import update_student_risk
    from websocket_manager import manager

    logger.info("Ingestion loop started (interval=%ds)", interval_seconds)

    while True:
        try:
            await asyncio.sleep(interval_seconds)

            if _paused:
                logger.info("Ingestion paused — skipping cycle.")
                continue

            cycle_ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            logger.info("Ingestion cycle at %s", cycle_ts)
            changes = 0

            for student in STUDENTS:
                try:
                    change = await poll_lms(student)
                    if change is None:
                        continue

                    # ── CRITICAL: apply the change to student state ────
                    # Without this mutation, risk score won't actually change
                    for course in student.get("courses", []):
                        if course["id"] == change["course_id"]:
                            for assignment in course.get("assignments", []):
                                if assignment["id"] == change["assignment_id"]:
                                    assignment["submitted"] = False
                                    break
                            break

                    old_score = student.get("risk_score", 0.0)

                    # Run the full ML pipeline (predict + SHAP + projection)
                    update_student_risk(student)

                    new_score = student.get("risk_score", 0.0)
                    changes  += 1

                    # ── WebSocket fan-out ──────────────────────────────
                    # Broadcast the risk update to ALL connected advisor
                    # clients simultaneously. The WebSocket manager holds
                    # a set of active connections and sends JSON to each
                    # one. Latency is typically <100ms from LMS detection
                    # to dashboard render.
                    await manager.broadcast({
                        "type":              "risk_update",
                        "source":            "autonomous_ingestion",
                        "student_id":        student["id"],
                        "student_name":      student["name"],
                        "major":             student.get("major", ""),
                        "old_risk_score":    old_score,
                        "new_risk_score":    new_score,
                        "risk_level":        student["risk_level"],
                        "risk_flags":        student.get("risk_flags", []),
                        "event_type":        "missed_assignment",
                        "event_description": (
                            f"'{change['assignment_title']}' detected "
                            f"missing in {change['course_name']}"
                        ),
                        "projected_score_7d":  student.get("projected_score_7d"),
                        "trend":               student.get("trend", "stable"),
                        "will_cross_critical": student.get("will_cross_critical", False),
                        "anomaly_detected":    student.get("anomaly_detected", False),
                        "anomaly_severity":    student.get("anomaly_severity", 0.0),
                        "timestamp":           student.get("last_updated", cycle_ts),
                    })

                    logger.info(
                        "AUTO: %s — '%s' (%.1f → %.1f)",
                        student["name"],
                        change["assignment_title"],
                        old_score,
                        new_score,
                    )

                except Exception as exc:
                    logger.exception("Error processing student %s: %s", student.get("id"), exc)

            logger.info("Ingestion cycle complete — %d change(s) detected.", changes)

        except Exception as exc:
            logger.exception("Ingestion loop error: %s", exc)
            # Never crash — wait and retry
            await asyncio.sleep(5)
