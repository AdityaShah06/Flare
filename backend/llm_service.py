from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict

import httpx
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


# ── Structured context injection ──────────────────────────────────────────
# Converts a student's full profile into a compact text block that gets
# injected into the LLM prompt. This is the bridge between the ML pipeline
# (risk score, SHAP, trajectory) and the language model (natural language
# interventions). The context includes: demographic info, risk indicators,
# top risk flags, and a list of unsubmitted assignments with course names.
def _build_context(student: Dict[str, Any]) -> str:
    lines = [
        f"Name: {student['name']}",
        f"Major: {student.get('major', 'Unknown')}",
        f"Year: {student.get('year', '?')}",
        f"GPA: {student.get('gpa', 'N/A')}",
        f"Risk Score: {student.get('risk_score', 0)}/100 ({student.get('risk_level', 'unknown')})",
        f"Trend: {student.get('trend', 'stable')}",
        f"Projected Score in 7 Days: {student.get('projected_score_7d', 'N/A')}",
    ]

    flags = student.get("risk_flags", [])
    if flags:
        lines.append("Risk Flags:")
        for f in flags[:3]:
            lines.append(f"  - {f}")

    now = datetime.now(timezone.utc)
    overdue = []
    for course in student.get("courses", []):
        for a in course.get("assignments", []):
            due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
            if due <= now and not a.get("submitted", False):
                overdue.append(f"  - {a['title']} ({course['name']}) — due {a['due_date'][:10]}")

    if overdue:
        lines.append("Unsubmitted Past-Due Assignments:")
        lines.extend(overdue[:6])

    return "\n".join(lines)


def _get_probability(student: Dict[str, Any]) -> float:
    explanation = student.get("shap_explanation", [])
    score = student.get("risk_score", 0)
    return score / 100.0


async def generate_intervention(student: Dict[str, Any], intervention_type: str) -> str:
    context = _build_context(student)
    probability = _get_probability(student)

    if intervention_type == "student_nudge":
        system_msg = (
            "You are an academic support AI. Speak directly to the student. "
            "Be specific and brief. No filler. No condescension."
        )
        user_msg = (
            f"Student: {context}. Write a 3-4 sentence intervention. "
            f"Lead with the single most urgent action. Reference their major. "
            f"End with one forward-looking sentence."
        )
    elif intervention_type == "advisor_email":
        system_msg = (
            "You are an automated academic early-warning system. "
            "Write professional advisor alerts. Include specific numbers."
        )
        user_msg = (
            f"Student: {context}. Write a professional alert email. "
            f"Subject line starts with [FLARE ALERT]. "
            f"Body: risk summary with numbers, ML model confidence ({probability * 100:.0f}%), "
            f"projected score in 7 days, one recommended action, "
            f"request to respond within 24 hours. Max 6 sentences."
        )
    else:
        return f"Unknown intervention type: {intervention_type}"

    if not ANTHROPIC_API_KEY:
        return _fallback(student, intervention_type)

    # ── Anthropic API call ─────────────────────────────────────────
    # Uses the Messages API with a system/user prompt pattern:
    #   system: defines the AI's role and constraints
    #   user:   provides student context + generation instructions
    # The model is configurable via the json payload — swap claude-opus-4-5
    # for any other model or point to a self-hosted endpoint for
    # on-premises deployments that keep student data off third-party servers.
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-opus-4-5",
                    "max_tokens": 400,
                    "system": system_msg,
                    "messages": [{"role": "user", "content": user_msg}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
    except Exception:
        return _fallback(student, intervention_type)


def _fallback(student: Dict[str, Any], intervention_type: str) -> str:
    name = student.get("name", "Student")
    major = student.get("major", "your program")
    score = student.get("risk_score", 0)
    level = student.get("risk_level", "unknown")
    projected = student.get("projected_score_7d", score)
    trend = student.get("trend", "stable")
    flags = student.get("risk_flags", [])
    flag_text = "; ".join(flags[:3]) if flags else "multiple academic concerns"

    overdue_titles = []
    now = datetime.now(timezone.utc)
    for course in student.get("courses", []):
        for a in course.get("assignments", []):
            due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
            if due <= now and not a.get("submitted", False):
                overdue_titles.append(a["title"])

    overdue_text = ", ".join(overdue_titles[:3]) if overdue_titles else "several assignments"

    if intervention_type == "student_nudge":
        return (
            f"{name}, your most urgent priority right now is submitting your overdue work: "
            f"{overdue_text}. Your current risk indicators show {flag_text}, "
            f"which is affecting your standing in {major}. "
            f"Your projected risk score in 7 days is {projected:.0f}/100 "
            f"({'rising' if trend == 'deteriorating' else trend}). "
            f"Start with the single oldest missing assignment today — "
            f"even a partial submission can reverse this trajectory."
        )
    else:
        return (
            f"Subject: [FLARE ALERT] {name} — Risk Level: {level.upper()} ({score:.0f}/100)\n\n"
            f"Dear Advisor,\n\n"
            f"This is an automated alert from the Flare early-warning system. "
            f"{name} ({major}, Year {student.get('year', '?')}, GPA {student.get('gpa', 'N/A')}) "
            f"has reached a {level} risk level with a score of {score:.0f}/100. "
            f"ML model confidence: {score:.0f}%. "
            f"Key risk factors: {flag_text}. "
            f"The model projects their score will reach {projected:.0f}/100 within 7 days "
            f"({trend} trend). "
            f"Recommended action: schedule a meeting with {name} within 48 hours to discuss "
            f"their {len(overdue_titles)} overdue assignments and develop a recovery plan. "
            f"Please respond to this alert within 24 hours.\n\n"
            f"— Flare Academic Early-Warning System"
        )
