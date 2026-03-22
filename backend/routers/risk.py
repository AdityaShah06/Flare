from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from mock_data import STUDENTS
from risk_model import project_trajectory, update_student_risk

router = APIRouter(prefix="/risk", tags=["risk"])

FEATURE_HUMAN_LABELS = {
    "missed_ratio": "Assignment Completion",
    "avg_grade": "Grade Average",
    "min_grade": "Lowest Course Grade",
    "credit_hours": "Credit Load",
    "consecutive_missed": "Submission Streak",
    "grade_variance": "Grade Consistency",
    "submission_velocity": "Recent Activity",
}


def _find_student(student_id: str) -> Dict[str, Any]:
    for s in STUDENTS:
        if s["id"] == student_id:
            return s
    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")


def _risk_summary(s: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "student_id": s["id"],
        "name": s["name"],
        "email": s["email"],
        "major": s.get("major", ""),
        "year": s.get("year", 0),
        "gpa": s.get("gpa", 0.0),
        "risk_score": s.get("risk_score", 0.0),
        "risk_level": s.get("risk_level", "low"),
        "risk_flags": s.get("risk_flags", []),
        "risk_history": s.get("risk_history", []),
        "shap_explanation": s.get("shap_explanation", []),
        "projected_score_7d": s.get("projected_score_7d"),
        "trend": s.get("trend", "stable"),
        "last_updated": s.get("last_updated", ""),
    }


@router.get("/all")
async def risk_all() -> List[Dict[str, Any]]:
    for s in STUDENTS:
        update_student_risk(s)
    summaries = [_risk_summary(s) for s in STUDENTS]
    summaries.sort(key=lambda x: x["risk_score"], reverse=True)
    return summaries


@router.get("/distribution")
async def risk_distribution() -> Dict[str, int]:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for s in STUDENTS:
        level = s.get("risk_level", "low")
        if level in counts:
            counts[level] += 1
    return counts


@router.get("/{student_id}")
async def risk_single(student_id: str) -> Dict[str, Any]:
    student = _find_student(student_id)
    update_student_risk(student)
    return _risk_summary(student)


@router.get("/{student_id}/explain")
async def risk_explain(student_id: str) -> List[Dict[str, Any]]:
    student = _find_student(student_id)
    update_student_risk(student)
    explanation = student.get("shap_explanation", [])
    result = []
    for entry in explanation:
        result.append({
            **entry,
            "human_label": FEATURE_HUMAN_LABELS.get(entry["feature"], entry["feature"]),
        })
    return result


@router.get("/{student_id}/projection")
async def risk_projection(student_id: str) -> Dict[str, Any]:
    student = _find_student(student_id)
    return project_trajectory(student.get("risk_history", []))


# ── Anomaly detection endpoint ─────────────────────────────────────────────
# Returns whether the student's risk trajectory is accelerating abnormally
# compared to their own historical baseline.
@router.get("/{student_id}/anomaly")
async def get_anomaly(student_id: str) -> Dict[str, Any]:
    student = _find_student(student_id)
    update_student_risk(student)
    return {
        "student_id":          student_id,
        "anomaly_detected":    student.get("anomaly_detected", False),
        "anomaly_severity":    student.get("anomaly_severity", 0.0),
        "anomaly_description": student.get("anomaly_description", ""),
    }


# ── Peer matching endpoint ─────────────────────────────────────────────────
# Returns students with the most similar behavioral feature vectors,
# identified by cosine similarity in the 7-dimensional feature space.
@router.get("/{student_id}/peers")
async def get_peer_matches(student_id: str) -> List[Dict[str, Any]]:
    from risk_model import find_peer_matches
    student = _find_student(student_id)
    return find_peer_matches(student, STUDENTS)


# ── Projection with confidence intervals ───────────────────────────────────
# Extends the base projection endpoint with upper/lower confidence bands.
@router.get("/{student_id}/projection-ci")
async def get_projection_with_ci(student_id: str) -> Dict[str, Any]:
    from risk_model import project_trajectory_with_confidence
    student = _find_student(student_id)
    return project_trajectory_with_confidence(
        student.get("risk_history", [])
    )


# ── FERPA audit trail ──────────────────────────────────────────────────────
# Returns the full history of every risk prediction ever computed for a
# student, with timestamps, SHAP values, and projections. Required under
# FERPA for any automated system that influences decisions about students.
@router.get("/audit/{student_id}")
async def get_audit_log(
    student_id: str,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    try:
        from database import SessionLocal
        from db_models import RiskEvent
        db = SessionLocal()
        events = (
            db.query(RiskEvent)
            .filter(RiskEvent.student_id == student_id)
            .order_by(RiskEvent.timestamp.desc())
            .limit(limit)
            .all()
        )
        result = [
            {
                "timestamp":        e.timestamp.isoformat() if e.timestamp else "",
                "risk_score":       e.risk_score,
                "risk_level":       e.risk_level,
                "risk_flags":       e.risk_flags,
                "projected_score":  e.projected_score,
                "trend":            e.trend,
                "anomaly_detected": e.anomaly_detected,
                "event_type":       e.event_type,
                "event_source":     e.event_source,
            }
            for e in events
        ]
        db.close()
        return result
    except Exception:
        return []

