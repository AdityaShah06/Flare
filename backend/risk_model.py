from __future__ import annotations

import os
import warnings
from datetime import datetime, timezone, timedelta
from math import exp
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=FutureWarning)

FEATURES = [
    "missed_ratio",
    "avg_grade",
    "min_grade",
    "credit_hours",
    "consecutive_missed",
    "grade_variance",
    "submission_velocity",
]

FEATURE_HUMAN_LABELS: Dict[str, str] = {
    "missed_ratio":        "Assignment Completion",
    "avg_grade":           "Grade Average",
    "min_grade":           "Lowest Course Grade",
    "credit_hours":        "Credit Load",
    "consecutive_missed":  "Submission Streak",
    "grade_variance":      "Grade Consistency",
    "submission_velocity": "Recent Activity",
}

_DIR         = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH  = os.path.join(_DIR, "models", "risk_model.joblib")
_SCALER_PATH = os.path.join(_DIR, "models", "scaler.joblib")

MODEL:     GradientBoostingClassifier | None = None
SCALER:    StandardScaler | None             = None
EXPLAINER: Any                               = None


# ── Training (fallback only — runs only if .joblib missing) ───────────────
def generate_training_data(n: int = 3000) -> pd.DataFrame:
    rng = np.random.default_rng(seed=42)
    rows = []
    for _ in range(n):
        missed_ratio        = float(rng.beta(1.5, 5.0))
        avg_grade           = float(rng.normal(74, 13))
        min_grade           = float(avg_grade - rng.exponential(9))
        credit_hours        = float(rng.choice(
            [12, 13, 15, 16, 18, 19, 21],
            p=[0.04, 0.08, 0.30, 0.22, 0.20, 0.10, 0.06],
        ))
        consecutive_missed  = float(rng.choice(
            [0, 1, 2, 3, 4, 5],
            p=[0.48, 0.24, 0.13, 0.08, 0.04, 0.03],
        ))
        grade_variance      = float(rng.exponential(6.5))
        submission_velocity = float(rng.poisson(3))

        avg_grade = float(np.clip(avg_grade, 0, 100))
        min_grade = float(np.clip(min_grade, 0, 100))

        # +5.5 bias shifts positive rate to ~30-40%
        risk_logit = (
            5.5
            + 3.8  * missed_ratio
            - 0.065 * avg_grade
            - 0.045 * min_grade
            + 0.09  * max(0.0, credit_hours - 15.0)
            + 0.45  * consecutive_missed
            + 0.06  * grade_variance
            - 0.12  * submission_velocity
            + float(rng.normal(0, 0.35))
        )
        prob  = 1 / (1 + exp(-risk_logit))
        label = int(rng.random() < prob)

        rows.append({
            "missed_ratio":        missed_ratio,
            "avg_grade":           avg_grade,
            "min_grade":           min_grade,
            "credit_hours":        credit_hours,
            "consecutive_missed":  consecutive_missed,
            "grade_variance":      grade_variance,
            "submission_velocity": submission_velocity,
            "label":               label,
        })
    return pd.DataFrame(rows)


def _train_and_save() -> None:
    """Train model and save to disk. Only called when .joblib is missing."""
    global MODEL, SCALER

    print("No saved model found — training from scratch (this takes ~60s)...")
    df = generate_training_data(3000)
    X  = df[FEATURES].values
    y  = df["label"].values

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = GradientBoostingClassifier(
        n_estimators=300,
        learning_rate=0.04,
        max_depth=4,
        subsample=0.8,
        min_samples_leaf=10,
        random_state=42,
    )
    model.fit(X_scaled, y)

    os.makedirs(os.path.join(_DIR, "models"), exist_ok=True)
    joblib.dump(model,  _MODEL_PATH)
    joblib.dump(scaler, _SCALER_PATH)
    print(f"Model trained and saved to {_MODEL_PATH}")

    MODEL  = model
    SCALER = scaler


# ── Primary entry point called by main.py on startup ─────────────────────
def load_model() -> None:
    """
    Load pre-trained model from disk.
    Falls back to training if .joblib files are missing.
    Always called once on startup — never during requests.
    """
    global MODEL, SCALER, EXPLAINER

    if os.path.exists(_MODEL_PATH) and os.path.exists(_SCALER_PATH):
        print(f"Loading risk model from disk...")
        MODEL  = joblib.load(_MODEL_PATH)
        SCALER = joblib.load(_SCALER_PATH)
        print("Risk model loaded.")
    else:
        _train_and_save()

    import shap
    EXPLAINER = shap.TreeExplainer(MODEL)
    print("SHAP explainer ready.")


# ── Keep train_model() for backward compatibility ─────────────────────────
def train_model() -> Tuple[GradientBoostingClassifier, StandardScaler]:
    """
    Legacy entry point. Prefer load_model() — it loads from disk first.
    """
    load_model()
    return MODEL, SCALER  # type: ignore[return-value]


# ── Feature extraction ─────────────────────────────────────────────────────
# Converts a student's course/assignment data into the 7-dimensional
# feature vector the ML model expects. Each feature is a behavioral
# signal extractable from any LMS without demographic data.
#
#   missed_ratio        → fraction of past-due assignments not submitted
#   avg_grade           → mean grade across all enrolled courses
#   min_grade           → lowest single course grade (catches hidden failures)
#   credit_hours        → total enrolled credits (structural overload signal)
#   consecutive_missed  → trailing streak of unsubmitted work (momentum)
#   grade_variance      → std dev of course grades (instability detector)
#   submission_velocity → assignments submitted in last 7 days (engagement)
def extract_features(student: Dict[str, Any]) -> np.ndarray:
    now = datetime.now(timezone.utc)

    all_assignments = [
        a
        for course in student.get("courses", [])
        for a in course.get("assignments", [])
    ]

    past_due = [
        a for a in all_assignments
        if datetime.fromisoformat(
            a["due_date"].replace("Z", "+00:00")
        ) <= now
    ]

    total_past   = len(past_due)
    missed_past  = [a for a in past_due if not a.get("submitted", False)]
    missed_ratio = len(missed_past) / total_past if total_past > 0 else 0.0

    course_grades  = [c["current_grade"] for c in student.get("courses", [])]
    avg_grade      = float(np.mean(course_grades))  if course_grades else 0.0
    min_grade      = float(np.min(course_grades))   if course_grades else 0.0
    grade_variance = float(np.std(course_grades))   if len(course_grades) > 1 else 0.0
    credit_hours   = float(sum(c["credits"] for c in student.get("courses", [])))

    # Consecutive missed streak — most recent first
    sorted_past = sorted(past_due, key=lambda a: a["due_date"], reverse=True)
    consecutive_missed = 0
    for a in sorted_past:
        if not a.get("submitted", False):
            consecutive_missed += 1
        else:
            break

    seven_days_ago = now - timedelta(days=7)
    submission_velocity = sum(
        1 for a in all_assignments
        if a.get("submitted", False)
        and datetime.fromisoformat(
            a["due_date"].replace("Z", "+00:00")
        ) >= seven_days_ago
    )

    return np.array([[
        missed_ratio,
        avg_grade,
        min_grade,
        credit_hours,
        float(consecutive_missed),
        grade_variance,
        float(submission_velocity),
    ]])


# ── Prediction ─────────────────────────────────────────────────────────────
# Inference pipeline: scale features → predict probability → compute
# SHAP attributions → classify risk level. The model was trained offline
# by generate_artifacts.py and loaded from disk on startup. This function
# only runs inference — it never modifies the model weights.
def predict_risk(student: Dict[str, Any]) -> Dict[str, Any]:
    assert MODEL is not None and SCALER is not None and EXPLAINER is not None, \
        "Model not loaded. Call load_model() first."

    X        = extract_features(student)
    X_scaled = SCALER.transform(X)
    prob     = float(MODEL.predict_proba(X_scaled)[0][1])
    score    = round(prob * 100, 1)

    # SHAP values — GBM returns shape (n_samples, n_features) directly
    shap_values = EXPLAINER.shap_values(X_scaled)
    sv = shap_values[0] if not isinstance(shap_values, list) else shap_values[0][0]

    explanation = []
    for fname, fval, sval in zip(FEATURES, X[0], sv):
        explanation.append({
            "feature":     fname,
            "value":       round(float(fval), 3),
            "shap":        round(float(sval), 4),
            "direction":   "risk" if sval > 0 else "protective",
            "human_label": FEATURE_HUMAN_LABELS.get(fname, fname),
        })
    explanation.sort(key=lambda x: abs(x["shap"]), reverse=True)

    level = (
        "low"      if score <= 25 else
        "medium"   if score <= 50 else
        "high"     if score <= 75 else
        "critical"
    )

    return {
        "score":       score,
        "level":       level,
        "probability": round(prob, 4),
        "explanation": explanation,
    }


# ── Trajectory projection ──────────────────────────────────────────────────
def project_trajectory(risk_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    if len(risk_history) < 3:
        return {
            "trend":               "insufficient_data",
            "projected_score_7d":  None,
            "projected_points":    [],
            "slope":               0.0,
            "will_cross_critical": False,
        }

    recent  = risk_history[-10:]
    scores  = np.array([p["score"] for p in recent], dtype=float)
    x       = np.arange(len(scores), dtype=float)
    coeffs  = np.polyfit(x, scores, 1)
    slope   = float(coeffs[0])

    future_x      = np.arange(len(scores), len(scores) + 7, dtype=float)
    future_scores = np.clip(np.polyval(coeffs, future_x), 0, 100)

    trend = (
        "improving"     if slope < -0.5 else
        "stable"        if abs(slope) <= 0.5 else
        "deteriorating"
    )

    will_cross = bool(float(future_scores[-1]) > 75 and scores[-1] <= 75)

    return {
        "trend":               trend,
        "slope":               round(slope, 3),
        "projected_score_7d":  round(float(future_scores[-1]), 1),
        "will_cross_critical": will_cross,
        "projected_points": [
            {"day": int(i + 1), "score": round(float(s), 1)}
            for i, s in enumerate(future_scores)
        ],
    }


# ── Trajectory projection with confidence intervals ────────────────────────
# Extends the base projection with upper/lower confidence bands.
# Uses the standard error of residuals from the linear fit, scaled by
# distance from the training window mean. Bands widen as we project
# further into the future — reflecting growing uncertainty over time.
# The 1.5× multiplier on CI width approximates a ~85% interval.
def project_trajectory_with_confidence(
    risk_history: List[Dict[str, Any]],
) -> Dict[str, Any]:
    if len(risk_history) < 3:
        return {
            "trend":               "insufficient_data",
            "slope":               0.0,
            "projected_score_7d":  None,
            "will_cross_critical": False,
            "projected_points":    [],
            "confidence_upper":    [],
            "confidence_lower":    [],
        }

    recent  = risk_history[-10:]
    scores  = np.array([h["score"] for h in recent], dtype=float)
    x       = np.arange(len(scores), dtype=float)
    coeffs  = np.polyfit(x, scores, 1)
    slope   = float(coeffs[0])

    # Residual standard error from the linear fit
    fitted  = np.polyval(coeffs, x)
    resid   = scores - fitted
    std_err = float(np.std(resid))

    # Project 7 days forward
    future_x      = np.arange(len(scores), len(scores) + 7, dtype=float)
    future_scores = np.clip(np.polyval(coeffs, future_x), 0, 100)

    # Confidence intervals widen with distance from training mean
    x_mean = x.mean()
    ss_x   = float(np.sum((x - x_mean) ** 2)) + 1e-6
    ci_width = std_err * np.sqrt(1 + (future_x - x_mean) ** 2 / ss_x)

    upper = np.clip(future_scores + 1.5 * ci_width, 0, 100)
    lower = np.clip(future_scores - 1.5 * ci_width, 0, 100)

    trend = (
        "improving"     if slope < -0.5 else
        "stable"        if abs(slope) <= 0.5 else
        "deteriorating"
    )

    will_cross = bool(future_scores[-1] > 75 and scores[-1] <= 75)

    return {
        "trend":               trend,
        "slope":               round(slope, 3),
        "projected_score_7d":  round(float(future_scores[-1]), 1),
        "will_cross_critical": will_cross,
        "projected_points": [
            {"day": int(i + 1), "score": round(float(s), 1)}
            for i, s in enumerate(future_scores)
        ],
        "confidence_upper": [
            {"day": int(i + 1), "score": round(float(s), 1)}
            for i, s in enumerate(upper)
        ],
        "confidence_lower": [
            {"day": int(i + 1), "score": round(float(s), 1)}
            for i, s in enumerate(lower)
        ],
    }


# ── Anomaly detection ──────────────────────────────────────────────────────
# Detects students whose risk is accelerating abnormally compared to their
# own historical baseline. The algorithm:
#   1. Split risk history into baseline window (all but last 5) and recent (last 5)
#   2. Fit a linear slope to each window
#   3. Acceleration = recent_slope - baseline_slope
#   4. Severity = |acceleration| / baseline_std_dev (z-score-like normalization)
#   5. Flag as anomaly if acceleration > 1.2 AND severity > 1.0
#
# This catches students in early freefall — a student at a stable 60 can
# trigger an alert if their score is rising 3x faster than their own norm.
def detect_acceleration_anomaly(risk_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    if len(risk_history) < 6:
        return {
            "anomaly":      False,
            "severity":     0.0,
            "acceleration": 0.0,
            "description":  "",
        }

    scores = np.array([h["score"] for h in risk_history])

    # Split into baseline (everything before last 5) and recent window
    baseline = scores[:-5]
    recent   = scores[-5:]

    if len(baseline) < 2:
        return {
            "anomaly": False, "severity": 0.0,
            "acceleration": 0.0, "description": "",
        }

    # Rate of change in each window
    baseline_slope = float(
        np.polyfit(range(len(baseline)), baseline, 1)[0]
    )
    recent_slope = float(
        np.polyfit(range(len(recent)), recent, 1)[0]
    )

    acceleration = recent_slope - baseline_slope
    baseline_std = float(np.std(baseline)) if len(baseline) > 1 else 1.0
    severity     = abs(acceleration) / max(baseline_std, 0.5)
    anomaly      = acceleration > 1.2 and severity > 1.0

    return {
        "anomaly":      anomaly,
        "severity":     round(severity, 2),
        "acceleration": round(acceleration, 2),
        "description": (
            f"Risk accelerating {acceleration:.1f}pts/period "
            f"above baseline"
            if anomaly else ""
        ),
    }


# ── Peer matching via cosine similarity ────────────────────────────────────
# Finds students with the most similar behavioral feature vectors using
# cosine similarity in the 7-dimensional feature space. This allows advisors
# to identify students with matching "risk fingerprints" and apply
# interventions that worked for comparable cases.
#
# Cosine similarity measures the angle between two vectors, ignoring
# magnitude — so a student taking 12 credits and one taking 18 credits
# can still be "similar" if their behavioral patterns are proportional.
def find_peer_matches(
    student: Dict[str, Any],
    all_students: List[Dict[str, Any]],
    top_n: int = 2,
) -> List[Dict[str, Any]]:
    target = extract_features(student)[0]
    results = []

    for other in all_students:
        if other["id"] == student["id"]:
            continue
        other_feat = extract_features(other)[0]
        dot   = np.dot(target, other_feat)
        norms = np.linalg.norm(target) * np.linalg.norm(other_feat)
        sim   = float(dot / norms) if norms > 1e-8 else 0.0
        results.append({
            "student_id": other["id"],
            "name":       other["name"],
            "major":      other["major"],
            "similarity": round(sim, 3),
            "risk_level": other["risk_level"],
            "risk_score": other["risk_score"],
        })

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_n]


# ── Human-readable flags ───────────────────────────────────────────────────
def _make_flags(
    explanation: List[Dict[str, Any]],
    student: Dict[str, Any],
) -> List[str]:
    flags: List[str] = []
    for entry in explanation:
        if entry["direction"] != "risk" or abs(entry["shap"]) < 0.05:
            continue
        fname = entry["feature"]
        fval  = entry["value"]

        if fname == "missed_ratio":
            flags.append(f"{int(fval * 100)}% of past assignments not submitted")
        elif fname == "avg_grade":
            flags.append(f"Grade average at {fval:.0f}%")
        elif fname == "min_grade":
            worst = min(
                student.get("courses", []),
                key=lambda c: c["current_grade"],
                default=None,
            )
            cname = worst["name"] if worst else "a course"
            flags.append(f"Failing {cname} ({fval:.0f}%)")
        elif fname == "credit_hours":
            flags.append(f"Enrolled in {int(fval)} credit hours (high load)")
        elif fname == "consecutive_missed":
            flags.append(f"{int(fval)} consecutive missed submissions")
        elif fname == "grade_variance":
            flags.append("Inconsistent performance across courses")
        elif fname == "submission_velocity":
            flags.append("No submissions recorded in the last 7 days")

        if len(flags) >= 3:
            break
    return flags


# ── Master update — mutates student dict in place ─────────────────────────
def update_student_risk(student: Dict[str, Any]) -> None:
    """
    Runs full ML pipeline on one student:
      1. Extract 7 behavioral features from course/assignment data
      2. Scale features and run GBM inference
      3. Compute SHAP attributions for explainability
      4. Project 7-day risk trajectory
      5. Detect acceleration anomalies
      6. Log prediction to SQLite audit trail

    Called: on startup, on every event, by the ingestion loop.
    """
    result     = predict_risk(student)
    projection = project_trajectory(student.get("risk_history", []))
    flags      = _make_flags(result["explanation"], student)
    ts         = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    student["risk_score"]          = result["score"]
    student["risk_level"]          = result["level"]
    student["risk_flags"]          = flags
    student["shap_explanation"]    = result["explanation"]
    student["projected_score_7d"]  = projection["projected_score_7d"]
    student["trend"]               = projection["trend"]
    student["will_cross_critical"] = projection["will_cross_critical"]
    student["last_updated"]        = ts

    student.setdefault("risk_history", []).append({
        "timestamp": ts,
        "score":     result["score"],
    })

    # Run anomaly detection against the student's own risk history
    anomaly = detect_acceleration_anomaly(
        student.get("risk_history", [])
    )
    student["anomaly_detected"]    = anomaly["anomaly"]
    student["anomaly_severity"]    = anomaly["severity"]
    student["anomaly_description"] = anomaly["description"]

    # Persist prediction to the audit trail (non-blocking)
    # DB failures must never crash the risk pipeline
    try:
        from database import SessionLocal
        from db_models import RiskEvent
        db = SessionLocal()
        db.add(RiskEvent(
            student_id       = student["id"],
            risk_score       = student["risk_score"],
            risk_level       = student["risk_level"],
            risk_flags       = student["risk_flags"],
            shap_explanation = student["shap_explanation"],
            projected_score  = student.get("projected_score_7d"),
            trend            = student.get("trend", "stable"),
            anomaly_detected = anomaly["anomaly"],
            anomaly_severity = anomaly["severity"],
            event_type       = "score_update",
            event_source     = "system",
        ))
        db.commit()
        db.close()
    except Exception:
        pass

