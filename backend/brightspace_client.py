"""
Brightspace (D2L) Valence API client.

Connects to Brightspace via the Desire2Learn Valence REST framework
to pull student enrollment, grade, and submission data.

Authentication:
  Brightspace uses HMAC-SHA256 signed request URLs rather than
  simple bearer tokens. The app credentials (App ID + App Key) and
  user credentials (User ID + User Key) are combined to sign each
  request. In production this requires a registered OAuth2 application
  through the institution's ITS department.

Valence API docs: https://docs.valence.desire2learn.com/

Required env vars:
  BRIGHTSPACE_BASE_URL    e.g. https://truman.brightspace.com
  BRIGHTSPACE_APP_ID      Application ID from D2L admin console
  BRIGHTSPACE_APP_KEY     Application key (secret)
  BRIGHTSPACE_USER_ID     Authenticated user ID
  BRIGHTSPACE_USER_KEY    Authenticated user key
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

BRIGHTSPACE_BASE_URL = os.getenv("BRIGHTSPACE_BASE_URL", "")
BRIGHTSPACE_APP_ID   = os.getenv("BRIGHTSPACE_APP_ID", "")
BRIGHTSPACE_APP_KEY  = os.getenv("BRIGHTSPACE_APP_KEY", "")
BRIGHTSPACE_USER_ID  = os.getenv("BRIGHTSPACE_USER_ID", "")
BRIGHTSPACE_USER_KEY = os.getenv("BRIGHTSPACE_USER_KEY", "")


def _check_credentials() -> None:
    """Validate that all required Brightspace credentials are set."""
    if not all([BRIGHTSPACE_BASE_URL, BRIGHTSPACE_APP_ID,
                BRIGHTSPACE_APP_KEY]):
        raise ValueError(
            "Brightspace credentials not configured. "
            "Set BRIGHTSPACE_BASE_URL, BRIGHTSPACE_APP_ID, "
            "BRIGHTSPACE_APP_KEY, BRIGHTSPACE_USER_ID, "
            "BRIGHTSPACE_USER_KEY in .env"
        )


async def get_student_enrollments(user_id: str) -> list[dict[str, Any]]:
    """
    GET /d2l/api/lp/1.9/enrollments/myenrollments/

    Returns active course enrollments for the authenticated user.
    Each enrollment includes OrgUnitId (course ID), OrgUnit name,
    and role information.
    """
    _check_credentials()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{BRIGHTSPACE_BASE_URL}/d2l/api/lp/1.9/"
            f"enrollments/myenrollments/",
            params={
                "appId":   BRIGHTSPACE_APP_ID,
                "appKey":  BRIGHTSPACE_APP_KEY,
                "userId":  BRIGHTSPACE_USER_ID,
                "userKey": BRIGHTSPACE_USER_KEY,
            },
        )
        resp.raise_for_status()
        return resp.json().get("Items", [])


async def get_course_grades(
    course_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    """
    GET /d2l/api/le/1.9/:courseId/grades/values/:userId/

    Returns all grade objects for a student in a specific course.
    Each grade object includes GradeObjectId, DisplayedGrade,
    PointsNumerator, and PointsDenominator.
    """
    _check_credentials()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{BRIGHTSPACE_BASE_URL}/d2l/api/le/1.9/"
            f"{course_id}/grades/values/{user_id}/",
            params={
                "appId":   BRIGHTSPACE_APP_ID,
                "appKey":  BRIGHTSPACE_APP_KEY,
                "userId":  BRIGHTSPACE_USER_ID,
                "userKey": BRIGHTSPACE_USER_KEY,
            },
        )
        resp.raise_for_status()
        return resp.json().get("Objects", [])


async def get_dropbox_submissions(
    course_id: str,
    folder_id: str,
) -> list[dict[str, Any]]:
    """
    GET /d2l/api/le/1.9/:courseId/dropbox/folders/:folderId/
        submissions/mysubmissions/

    Returns submission objects for assignment dropbox folders.
    Brightspace uses "dropbox folders" as the equivalent of
    Canvas assignments. Each submission includes file metadata,
    timestamps, and feedback.
    """
    _check_credentials()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{BRIGHTSPACE_BASE_URL}/d2l/api/le/1.9/"
            f"{course_id}/dropbox/folders/{folder_id}/"
            f"submissions/mysubmissions/",
            params={
                "appId":   BRIGHTSPACE_APP_ID,
                "appKey":  BRIGHTSPACE_APP_KEY,
                "userId":  BRIGHTSPACE_USER_ID,
                "userKey": BRIGHTSPACE_USER_KEY,
            },
        )
        resp.raise_for_status()
        return resp.json()
