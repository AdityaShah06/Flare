from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Assignment(BaseModel):
    id: str
    title: str
    due_date: str
    submitted: bool
    grade: Optional[float] = None
    points_possible: float


class Course(BaseModel):
    id: str
    name: str
    code: str
    credits: int
    current_grade: float
    assignments: List[Assignment]
    instructor: str


class RiskHistoryPoint(BaseModel):
    timestamp: str
    score: float


class ShapEntry(BaseModel):
    feature: str
    value: float
    shap: float
    direction: str
    human_label: str = ""


class Student(BaseModel):
    id: str
    name: str
    email: str
    major: str
    year: int
    gpa: float
    advisor_id: str
    courses: List[Course]
    risk_score: float = 0.0
    risk_level: str = "low"
    risk_flags: List[str] = Field(default_factory=list)
    risk_history: List[RiskHistoryPoint] = Field(default_factory=list)
    shap_explanation: List[ShapEntry] = Field(default_factory=list)
    projected_score_7d: Optional[float] = None
    trend: str = "stable"
    will_cross_critical: bool = False
    last_updated: str = ""
    avatar_initials: str = ""


class Advisor(BaseModel):
    id: str
    name: str
    email: str
    department: str
    title: str
    student_ids: List[str]


class Event(BaseModel):
    student_id: str
    event_type: str
    payload: Dict[str, Any]


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str
    user_id: str
    name: str
    email: str


class RiskSummary(BaseModel):
    student_id: str
    name: str
    email: str
    major: str
    year: int
    gpa: float
    risk_score: float
    risk_level: str
    risk_flags: List[str]
    risk_history: List[RiskHistoryPoint]
    shap_explanation: List[ShapEntry]
    projected_score_7d: Optional[float]
    trend: str
    will_cross_critical: bool = False
    last_updated: str
