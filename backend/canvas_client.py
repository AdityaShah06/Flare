"""
Canvas LMS REST API client.

Connects to Canvas (Instructure) via their documented REST API
to pull student enrollment, assignment, and submission data.

Authentication options:
  1. Personal Access Token (simpler, suitable for development)
     Canvas → Account → Settings → Approved Integrations → New Access Token
  2. OAuth2 service account (production)
     Requires Canvas admin to register the application

Canvas API docs: https://canvas.instructure.com/doc/api/

Required env vars:
  CANVAS_BASE_URL       e.g. https://truman.instructure.com
  CANVAS_ACCESS_TOKEN   Personal access token or OAuth2 bearer token
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

CANVAS_BASE_URL = os.getenv("CANVAS_BASE_URL", "")
CANVAS_TOKEN    = os.getenv("CANVAS_ACCESS_TOKEN", "")


def _headers() -> dict:
    """Standard auth headers for all Canvas API requests."""
    return {
        "Authorization": f"Bearer {CANVAS_TOKEN}",
        "Content-Type":  "application/json",
    }


async def get_student_courses(user_id: str) -> list[dict[str, Any]]:
    """
    GET /api/v1/users/:id/courses

    Returns the list of active courses a student is enrolled in.
    Each course object includes id, name, course_code, and enrollment info.
    Paginated — we request up to 50 per page.
    """
    if not CANVAS_BASE_URL or not CANVAS_TOKEN:
        raise ValueError(
            "Canvas credentials not configured. "
            "Set CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN in .env"
        )
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{CANVAS_BASE_URL}/api/v1/users/{user_id}/courses",
            headers=_headers(),
            params={"enrollment_state": "active", "per_page": 50},
        )
        resp.raise_for_status()
        return resp.json()


async def get_course_assignments(course_id: str) -> list[dict[str, Any]]:
    """
    GET /api/v1/courses/:id/assignments

    Returns all assignments for a given course. Each assignment includes
    id, name, due_at, points_possible, and submission_types.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{CANVAS_BASE_URL}/api/v1/courses/{course_id}/assignments",
            headers=_headers(),
            params={"per_page": 100},
        )
        resp.raise_for_status()
        return resp.json()


async def get_student_submissions(
    course_id: str,
    student_id: str,
) -> list[dict[str, Any]]:
    """
    GET /api/v1/courses/:id/submissions

    Returns submission status and grades for a specific student.
    This is the primary data source for risk feature extraction —
    submission timestamps, grades, and workflow_state determine
    missed_ratio, avg_grade, and submission_velocity.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{CANVAS_BASE_URL}/api/v1/courses/{course_id}/submissions",
            headers=_headers(),
            params={
                "student_ids[]": student_id,
                "per_page": 100,
                "include[]": ["assignment", "submission_comments"],
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_course_roster(course_id: str) -> list[dict[str, Any]]:
    """
    GET /api/v1/courses/:id/enrollments

    Returns all enrolled students in a course.
    Used by the advisor dashboard to discover which students
    to monitor. Requires advisor-level (TA/Teacher) access token.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{CANVAS_BASE_URL}/api/v1/courses/{course_id}/enrollments",
            headers=_headers(),
            params={"type[]": "StudentEnrollment", "per_page": 100},
        )
        resp.raise_for_status()
        return resp.json()
