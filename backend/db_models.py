"""
ORM table definitions for the Flare persistence layer.

Six tables mirror the full data lifecycle:
  students, courses, assignments  → institutional records
  risk_events                     → ML prediction audit trail
  intervention_logs               → LLM-generated interventions
  lms_sync_log                    → raw LMS API polling history
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (Boolean, Column, DateTime, Float, ForeignKey,
                        Integer, JSON, String, Text)
from sqlalchemy.orm import relationship

from database import Base


class StudentRecord(Base):
    __tablename__ = "students"

    id              = Column(String, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    email           = Column(String, unique=True, index=True)
    major           = Column(String)
    year            = Column(Integer)
    gpa             = Column(Float)
    advisor_id      = Column(String)
    avatar_initials = Column(String(4))
    created_at      = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
    )

    risk_events   = relationship(
        "RiskEvent", back_populates="student",
        order_by="RiskEvent.timestamp",
    )
    courses       = relationship("CourseRecord", back_populates="student")
    interventions = relationship(
        "InterventionLog", back_populates="student",
    )


class CourseRecord(Base):
    __tablename__ = "courses"

    id            = Column(String, primary_key=True)
    student_id    = Column(String, ForeignKey("students.id"), index=True)
    name          = Column(String)
    code          = Column(String)
    credits       = Column(Integer)
    current_grade = Column(Float)
    instructor    = Column(String)

    student     = relationship("StudentRecord", back_populates="courses")
    assignments = relationship("AssignmentRecord", back_populates="course")


class AssignmentRecord(Base):
    __tablename__ = "assignments"

    id              = Column(String, primary_key=True)
    course_id       = Column(String, ForeignKey("courses.id"), index=True)
    title           = Column(String)
    due_date        = Column(String)
    submitted       = Column(Boolean, default=False)
    grade           = Column(Float, nullable=True)
    points_possible = Column(Float, default=100.0)

    course = relationship("CourseRecord", back_populates="assignments")


class RiskEvent(Base):
    """
    Audit trail for every risk prediction.
    Each row records a single ML inference: the score, SHAP values,
    projection, and anomaly flags. Used for FERPA compliance —
    every automated decision that could influence a student outcome
    must have a documented, timestamped reason.
    """
    __tablename__ = "risk_events"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    student_id       = Column(String, ForeignKey("students.id"), index=True)
    timestamp        = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    risk_score       = Column(Float)
    risk_level       = Column(String)
    risk_flags       = Column(JSON)
    shap_explanation = Column(JSON)
    projected_score  = Column(Float, nullable=True)
    trend            = Column(String)
    anomaly_detected = Column(Boolean, default=False)
    anomaly_severity = Column(Float, default=0.0)
    event_type       = Column(String)
    event_source     = Column(String)

    student = relationship("StudentRecord", back_populates="risk_events")


class InterventionLog(Base):
    __tablename__ = "intervention_logs"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    student_id        = Column(String, ForeignKey("students.id"), index=True)
    timestamp         = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
    )
    intervention_type = Column(String)
    generated_text    = Column(Text)
    triggered_by      = Column(String)

    student = relationship("StudentRecord", back_populates="interventions")


class LMSSyncLog(Base):
    """
    Raw polling history from LMS API calls.
    Every Canvas/Brightspace API response is logged here before
    processing, creating a complete data lineage from LMS event
    to risk score change.
    """
    __tablename__ = "lms_sync_log"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    timestamp   = Column(
        DateTime, default=lambda: datetime.now(timezone.utc),
    )
    source      = Column(String)
    student_id  = Column(String, index=True)
    event_type  = Column(String)
    raw_payload = Column(JSON)
    processed   = Column(Boolean, default=False)
