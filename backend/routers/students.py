from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from mock_data import STUDENTS
from risk_model import update_student_risk

router = APIRouter(prefix="/students", tags=["students"])


def _find_student(student_id: str) -> Dict[str, Any]:
    for s in STUDENTS:
        if s["id"] == student_id:
            return s
    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")


@router.get("")
async def list_students() -> List[Dict[str, Any]]:
    for s in STUDENTS:
        update_student_risk(s)
    return sorted(STUDENTS, key=lambda s: s["risk_score"], reverse=True)


@router.get("/{student_id}")
async def get_student(student_id: str) -> Dict[str, Any]:
    student = _find_student(student_id)
    update_student_risk(student)
    return student


@router.get("/{student_id}/timeline")
async def get_timeline(student_id: str) -> List[Dict[str, Any]]:
    student = _find_student(student_id)
    now = datetime.now(timezone.utc)
    timeline = []

    for course in student.get("courses", []):
        for a in course.get("assignments", []):
            due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
            days_until = (due - now).days

            if a.get("submitted", False):
                status = "completed"
            elif days_until < 0:
                status = "overdue"
            elif days_until <= 3:
                status = "due_soon"
            else:
                status = "upcoming"

            timeline.append({
                "assignment_id": a["id"],
                "title": a["title"],
                "course_name": course["name"],
                "course_code": course["code"],
                "due_date": a["due_date"],
                "submitted": a.get("submitted", False),
                "grade": a.get("grade"),
                "days_until_due": days_until,
                "status": status,
            })

    timeline.sort(key=lambda x: x["due_date"])
    return timeline
