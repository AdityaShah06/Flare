from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from llm_service import generate_intervention
from mock_data import STUDENTS

router = APIRouter(prefix="/generate", tags=["generate"])


def _find_student(student_id: str) -> Dict[str, Any]:
    for s in STUDENTS:
        if s["id"] == student_id:
            return s
    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")


@router.post("/nudge/{student_id}")
async def generate_nudge(student_id: str) -> Dict[str, Any]:
    student = _find_student(student_id)
    message = await generate_intervention(student, "student_nudge")
    return {
        "student_id": student_id,
        "message": message,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


@router.post("/advisor-email/{student_id}")
async def generate_advisor_email(student_id: str) -> Dict[str, Any]:
    student = _find_student(student_id)
    raw = await generate_intervention(student, "advisor_email")

    subject = ""
    body = raw
    lines = raw.strip().split("\n")
    first_line = lines[0].strip() if lines else ""

    if first_line.startswith("Subject:"):
        subject = first_line.replace("Subject:", "").strip()
        body = "\n".join(lines[1:]).strip()
    elif first_line.startswith("[FLARE"):
        subject = first_line
        body = "\n".join(lines[1:]).strip()

    if not subject:
        subject = f"[FLARE ALERT] {student['name']} — Risk: {student.get('risk_level', 'unknown').upper()}"

    return {
        "student_id": student_id,
        "subject": subject,
        "body": body,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
