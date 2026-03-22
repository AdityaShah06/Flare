"""
Data source abstraction layer.

This module decouples the rest of the application from the specific
LMS being used. All data access goes through these functions, so
switching between Canvas, Brightspace, or demo mode requires only
changing DATA_SOURCE in the .env file — no code changes needed.

Pattern:
  DATA_SOURCE=demo        → reads from in-memory mock_data.py (default)
  DATA_SOURCE=canvas      → calls Canvas REST API via canvas_client.py
  DATA_SOURCE=brightspace → calls Brightspace Valence API via brightspace_client.py

To add a new LMS:
  1. Create a new client module (e.g. moodle_client.py)
  2. Add a new branch in each function below
  3. Set DATA_SOURCE=moodle in .env
"""

from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()

DATA_SOURCE = os.getenv("DATA_SOURCE", "demo")


async def get_students_for_advisor(advisor_id: str) -> list[dict[str, Any]]:
    """
    Returns the list of student dicts an advisor is responsible for.
    The returned shape must match the Student dict structure used
    throughout the application (id, name, email, courses, etc.).
    """
    if DATA_SOURCE == "canvas":
        # In production, this would:
        # 1. Fetch advisor's courses via Canvas API
        # 2. Pull enrollment rosters for each course
        # 3. Normalize Canvas user objects into our Student dict format
        raise NotImplementedError(
            "Canvas data source not yet configured. "
            "Set CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN in .env, "
            "then implement the Canvas roster normalization pipeline."
        )

    elif DATA_SOURCE == "brightspace":
        # In production, this would:
        # 1. Fetch enrollments via Brightspace Valence API
        # 2. Pull grade values and dropbox submissions per student
        # 3. Normalize D2L objects into our Student dict format
        raise NotImplementedError(
            "Brightspace data source not yet configured. "
            "Set BRIGHTSPACE_* credentials in .env, "
            "then implement the Brightspace enrollment normalization."
        )

    else:
        # Demo mode — return from the in-memory synthetic dataset
        from mock_data import STUDENTS
        return STUDENTS


async def get_submissions_for_student(
    student_id: str,
    course_id: str,
) -> list[dict[str, Any]]:
    """
    Returns the latest submission data for a student in a course.
    Called by the ingestion loop on every polling cycle to detect
    new missed assignments or grade changes.
    """
    if DATA_SOURCE == "canvas":
        raise NotImplementedError(
            "Canvas submission fetch not configured."
        )

    elif DATA_SOURCE == "brightspace":
        raise NotImplementedError(
            "Brightspace submission fetch not configured."
        )

    else:
        from mock_data import STUDENTS
        student = next(
            (s for s in STUDENTS if s["id"] == student_id), None
        )
        if not student:
            return []
        for course in student.get("courses", []):
            if course["id"] == course_id:
                return course.get("assignments", [])
        return []
