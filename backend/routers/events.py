from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from mock_data import STUDENTS
from models import Event
from risk_model import update_student_risk
from websocket_manager import manager

router = APIRouter(prefix="/events", tags=["events"])


def _find_student(student_id: str) -> Dict[str, Any]:
    for s in STUDENTS:
        if s["id"] == student_id:
            return s
    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")


async def _broadcast_event(
    student: Dict[str, Any],
    old_score: float,
    event_type: str,
    event_description: str,
) -> None:
    payload = {
        "type": "risk_update",
        "source": "manual_event",
        "student_id": student["id"],
        "student_name": student["name"],
        "major": student.get("major", ""),
        "old_risk_score": old_score,
        "new_risk_score": student["risk_score"],
        "risk_level": student["risk_level"],
        "risk_flags": student.get("risk_flags", []),
        "event_type": event_type,
        "event_description": event_description,
        "projected_score_7d": student.get("projected_score_7d"),
        "trend": student.get("trend", "stable"),
        "will_cross_critical": student.get("will_cross_critical", False),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    await manager.broadcast(payload)


@router.post("")
async def handle_event(event: Event) -> Dict[str, Any]:
    student = _find_student(event.student_id)
    old_score = student.get("risk_score", 0.0)

    if event.event_type == "missed_assignment":
        course_id = event.payload.get("course_id")
        assignment_id = event.payload.get("assignment_id")
        found = False
        course_name = ""
        assignment_title = ""
        for course in student.get("courses", []):
            if course["id"] == course_id:
                course_name = course["name"]
                for a in course.get("assignments", []):
                    if a["id"] == assignment_id:
                        a["submitted"] = False
                        a["grade"] = None
                        assignment_title = a["title"]
                        found = True
                        break
                break
        if not found:
            raise HTTPException(status_code=404, detail="Course or assignment not found")

        update_student_risk(student)
        await _broadcast_event(
            student, old_score, "missed_assignment",
            f"'{assignment_title}' marked missing in {course_name}",
        )

    elif event.event_type == "grade_drop":
        course_id = event.payload.get("course_id")
        new_grade = event.payload.get("new_grade")
        if new_grade is None:
            raise HTTPException(status_code=400, detail="new_grade required")

        found = False
        course_name = ""
        old_grade = 0.0
        for course in student.get("courses", []):
            if course["id"] == course_id:
                old_grade = course["current_grade"]
                course["current_grade"] = float(new_grade)
                course_name = course["name"]
                found = True
                break
        if not found:
            raise HTTPException(status_code=404, detail="Course not found")

        update_student_risk(student)
        await _broadcast_event(
            student, old_score, "grade_drop",
            f"Grade in {course_name} dropped to {float(new_grade):.0f}%",
        )

    elif event.event_type == "overload_added":
        course_name = event.payload.get("course_name", "New Course")
        credits = event.payload.get("credits", 3)
        now = datetime.now(timezone.utc)
        new_course = {
            "id": f"c-new-{len(student.get('courses', []))+1}",
            "name": course_name,
            "code": f"NEW {100 + len(student.get('courses', []))}",
            "credits": int(credits),
            "current_grade": 75.0,
            "instructor": "TBA",
            "assignments": [
                {
                    "id": f"a-new-{i}",
                    "title": f"{course_name} Assignment {i}",
                    "due_date": (now + timedelta(days=7 * i)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "submitted": False,
                    "grade": None,
                    "points_possible": 100.0,
                }
                for i in range(1, 4)
            ],
        }
        student.setdefault("courses", []).append(new_course)

        update_student_risk(student)
        await _broadcast_event(
            student, old_score, "overload_added",
            f"Added {course_name} ({credits}cr) — credit overload",
        )

    elif event.event_type == "absence_streak":
        course_id = event.payload.get("course_id")
        count = event.payload.get("count", 3)

        course_name = ""
        for course in student.get("courses", []):
            if course["id"] == course_id:
                course_name = course["name"]
                break

        flags = student.get("risk_flags", [])
        flags.append(f"{count} consecutive absences in {course_name or 'a course'}")
        student["risk_flags"] = flags

        bump = min(count * 3, 100 - student.get("risk_score", 0))
        student["risk_score"] = min(100.0, student.get("risk_score", 0) + bump)

        update_student_risk(student)
        await _broadcast_event(
            student, old_score, "absence_streak",
            f"{count}-day absence streak in {course_name or 'a course'}",
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {event.event_type}")

    return {
        "status": "processed",
        "student_id": student["id"],
        "old_risk_score": old_score,
        "new_risk_score": student["risk_score"],
        "risk_level": student["risk_level"],
    }
