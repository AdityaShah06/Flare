# Flare — Student Retention Intelligence

> "1 in 3 university students who enroll never graduate.  
> By the time anyone notices, it's already too late."

Flare is an AI-powered early-warning system that monitors student 
behavioral signals in real time, scores dropout risk using a trained 
ML model, explains every prediction with SHAP attribution, projects 
7-day trajectories with confidence intervals, and generates 
personalized interventions using a large language model.

Built for university advisors who are already too busy to notice.

---

## How Flare Works
```
┌─────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                           │
│                                                             │
│   Canvas REST API              Brightspace Valence API      │
│   /api/v1/courses/             /d2l/api/le/1.9/             │
│   :id/submissions              :courseId/grades/values/     │
└──────────────────────────┬──────────────────────────────────┘
                           │  OAuth2 / Personal Access Token
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   INGESTION LAYER                           │
│                                                             │
│   Autonomous asyncio background task                        │
│   Polls LMS APIs every 30 seconds                          │
│   Detects state changes in submission and grade data        │
│   Writes raw events to SQLite audit log                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    ML PIPELINE                              │
│                                                             │
│   Feature Extraction (7 behavioral signals)                 │
│   ┌─────────────────────────────────────────┐              │
│   │ missed_ratio        submission_velocity  │              │
│   │ avg_grade           grade_variance       │              │
│   │ min_grade           consecutive_missed   │              │
│   │ credit_hours                             │              │
│   └─────────────────────────────────────────┘              │
│                           │                                 │
│                           ▼                                 │
│   GradientBoostingClassifier                                │
│   300 estimators · learning_rate 0.04 · max_depth 4        │
│   Trained on 3,000 synthetic LMS behavioral records        │
│   Test AUC: 0.84                                           │
│                           │                                 │
│                           ▼                                 │
│   SHAP TreeExplainer                                        │
│   Decomposes dropout probability into feature attributions  │
│   Every prediction is explainable and auditable             │
│                           │                                 │
│                           ▼                                 │
│   Anomaly Detection                                         │
│   Rate-of-change analysis vs student's own baseline         │
│   Flags students whose risk is accelerating abnormally      │
│                           │                                 │
│                           ▼                                 │
│   Trajectory Projection                                     │
│   Linear regression on risk history                         │
│   7-day forward projection with confidence intervals        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER                         │
│                                                             │
│   SQLite + SQLAlchemy ORM                                   │
│   ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│   │   students   │  │  risk_events │  │  interventions  │ │
│   │   courses    │  │  shap_values │  │  audit_log      │ │
│   │  assignments │  │  projections │  │  lms_sync_log   │ │
│   └──────────────┘  └──────────────┘  └─────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  REAL-TIME DELIVERY                         │
│                                                             │
│   FastAPI WebSocket fan-out                                 │
│   Every connected advisor client receives updates           │
│   simultaneously within 100ms of LMS state change          │
│                                                             │
│   Event payload:                                            │
│   { risk_score, risk_level, shap_explanation,              │
│     projected_score_7d, trend, will_cross_critical,        │
│     anomaly_detected, source: "autonomous" | "manual" }    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM LAYER                                │
│                                                             │
│   Claude claude-opus-4-5 via Anthropic API                  │
│   Structured context injection:                             │
│     · Student profile + behavioral flags                    │
│     · SHAP attribution (top 3 drivers)                     │
│     · Projected trajectory + confidence                     │
│     · Missing assignments with course names                 │
│                                                             │
│   Outputs:                                                  │
│     · Personalized student nudge (3-4 sentences)           │
│     · Advisor alert email (subject + body)                  │
│                                                             │
│   Fallback: rule-based templates when API unavailable       │
│   Configurable: swap in any LLM endpoint via env var        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS DASHBOARD                         │
│                                                             │
│   /advisor          Live risk overview, all students        │
│   /student/[id]     SHAP chart, projection, courses         │
│                                                             │
│   Real-time via WebSocket — no polling                      │
│   RiskGauge: custom SVG arc                                 │
│   ShapExplainer: custom tornado chart                       │
│   ProjectionChart: Recharts ComposedChart with CI bands     │
│   ParticleBackground: Canvas 2D particle field              │
└─────────────────────────────────────────────────────────────┘
```

---

## The ML Model

### Why Gradient Boosting

A single decision tree makes sharp discontinuous predictions.
Gradient boosting trains 300 trees sequentially — each one
correcting the mistakes of all trees before it. The final
prediction is the weighted sum of all 300 corrections.

At `learning_rate=0.04`, each tree contributes only 4% of its
correction to the ensemble. This shrinkage forces many small
steps rather than few large ones, producing better
generalization to unseen students.

### The 7 Features

| Feature | What it measures | Why it matters |
|---------|-----------------|----------------|
| `missed_ratio` | Past-due unsubmitted / total past-due | Normalized miss rate — removes semester timing bias |
| `avg_grade` | Mean grade across all courses | Overall academic standing — lagging indicator |
| `min_grade` | Lowest single course grade | Catches hidden failures masked by good averages |
| `credit_hours` | Total enrolled credits | Structural overload risk independent of performance |
| `consecutive_missed` | Trailing streak of unsubmitted work | Momentum signal — detects deterioration early |
| `grade_variance` | Std dev of course grades | Instability — a 92/88/41 student looks fine on average |
| `submission_velocity` | Assignments submitted in last 7 days | Recent engagement — the only forward-looking signal |

These 7 features were chosen specifically because they are
extractable from any LMS without requiring sensitive demographic
data. No race. No income. No mental health records. Only
behavioral telemetry — timestamps, submission status, grade
values. This is why Flare is FERPA-defensible.

### Model Performance

- Training set: 2,400 records (80%)
- Test set: 600 records (20%)
- Test AUC: **0.84**
- Positive rate (at-risk): 38.5%

An AUC of 0.84 means: pick any at-risk student and any safe
student at random — Flare correctly identifies which one is
at risk 84% of the time, having never seen either during
training. Most peer-reviewed academic early-warning systems
report AUC between 0.70 and 0.82.

### SHAP Explainability

SHAP (SHapley Additive exPlanations) comes from cooperative
game theory. The Shapley value for a feature answers: what is
the marginal contribution of this feature to the prediction,
averaged across all possible orderings of the other features?

For tree models, `shap.TreeExplainer` computes exact Shapley
values by traversing the decision tree structure — not an
approximation. Every prediction comes with 7 numbers showing
exactly which behavioral signal drove the score and by how much.

This matters for institutional deployment. Under FERPA, any
automated system that influences decisions affecting students
must be auditable. Every Flare prediction has a documented,
mathematical reason.

### Anomaly Detection

Beyond scoring risk level, Flare detects students whose risk
is accelerating abnormally compared to their own baseline:

1. Split risk history into baseline window and recent window
2. Compute rate-of-change (slope) in each window
3. Acceleration = recent slope − baseline slope
4. Severity = acceleration / baseline standard deviation
5. Flag if acceleration > 1.2 and severity > 1.0

A student can have a stable risk score of 60 and still trigger
an anomaly alert if that score is rising three times faster
than their own historical rate. This catches students in early
freefall before they cross any threshold.

---

## Architecture
```
flare/
├── backend/
│   ├── main.py                  FastAPI app, lifespan, WebSocket
│   ├── models.py                Pydantic request/response models
│   ├── database.py              SQLAlchemy engine + session factory
│   ├── db_models.py             ORM table definitions + relationships
│   ├── data_source.py           LMS abstraction layer
│   ├── canvas_client.py         Canvas REST API client
│   ├── brightspace_client.py    Brightspace Valence API client
│   ├── risk_model.py            GBM + SHAP + projection + anomaly
│   ├── ingestion_loop.py        Autonomous LMS polling agent
│   ├── llm_service.py           Anthropic API + fallback templates
│   ├── websocket_manager.py     WebSocket connection manager
│   ├── generate_artifacts.py    Train model + save .joblib
│   ├── models/
│   │   ├── risk_model.joblib    Trained GBM (597KB)
│   │   ├── scaler.joblib        Fitted StandardScaler
│   │   └── model_metadata.json  AUC, hyperparams, timestamp
│   ├── alembic/                 Database migrations
│   └── routers/
│       ├── auth.py
│       ├── students.py
│       ├── events.py
│       ├── risk.py
│       └── generate.py
└── frontend/
    └── src/
        ├── types/index.ts
        ├── lib/
        │   ├── api.ts
        │   └── utils.ts
        ├── hooks/
        │   ├── useWebSocket.ts
        │   └── useStudents.ts
        ├── components/
        │   ├── Navbar.tsx
        │   ├── LiveStatusBar.tsx
        │   ├── RiskBadge.tsx
        │   ├── RiskGauge.tsx
        │   ├── ShapExplainer.tsx
        │   ├── ProjectionChart.tsx
        │   ├── HeatmapCalendar.tsx
        │   ├── StudentCard.tsx
        │   ├── AlertFeed.tsx
        │   ├── CourseBreakdown.tsx
        │   ├── GeneratedEmailModal.tsx
        │   └── ModelStatusPanel.tsx
        └── app/
            ├── layout.tsx
            ├── page.tsx
            ├── login/page.tsx
            ├── advisor/page.tsx
            └── student/[id]/page.tsx
```

---

## LMS Integration

Flare connects to institutional LMS systems via their
documented REST APIs:

### Canvas (Instructure)
```
Authentication: Personal access token or OAuth2 service account
Base URL:       https://YOUR_INSTITUTION.instructure.com/api/v1

Endpoints:
  GET /courses                         List student courses
  GET /courses/:id/assignments         Course assignments
  GET /courses/:id/submissions         Submission status + grades
  GET /users/:id/courses               Student enrollment
  GET /courses/:id/enrollments         Course roster (advisor)
```

### Brightspace (D2L Valence)
```
Authentication: Institutional OAuth2 (App ID + App Key)
Base URL:       https://YOUR_INSTITUTION.brightspace.com

Endpoints:
  GET /d2l/api/lp/1.9/enrollments/myenrollments/
  GET /d2l/api/le/1.9/:courseId/grades/values/myGradeValues/
  GET /d2l/api/le/1.9/:courseId/dropbox/folders/
  GET /d2l/api/le/1.9/:courseId/dropbox/folders/:id/submissions/mysubmissions/
```

Both APIs are publicly documented and require institutional
service account credentials issued by university ITS — standard
procedure for any FERPA-compliant analytics tool operating
under the school official exception.

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

---

## Setup

### Backend
```bash
cd flare/backend

python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
# Edit .env with your credentials

python generate_artifacts.py    # Train model — runs once, ~90 seconds

uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd flare/frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## Configuration
```bash
# flare/backend/.env

# ── LLM ──────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your-key-here

# ── Canvas LMS ───────────────────────────────────────────────
# Canvas → Account → Settings → Approved Integrations → New Access Token
CANVAS_BASE_URL=https://your-institution.instructure.com
CANVAS_ACCESS_TOKEN=your-personal-access-token
CANVAS_OAUTH_CLIENT_ID=
CANVAS_OAUTH_CLIENT_SECRET=

# ── Brightspace (D2L Valence) ─────────────────────────────────
# Requires institutional OAuth2 credentials from ITS
BRIGHTSPACE_BASE_URL=https://your-institution.brightspace.com
BRIGHTSPACE_APP_ID=
BRIGHTSPACE_APP_KEY=
BRIGHTSPACE_USER_ID=
BRIGHTSPACE_USER_KEY=

# ── Database ─────────────────────────────────────────────────
# sqlite:///./flare.db     → persistent local file
# sqlite:///:memory:       → ephemeral (default)
DATABASE_URL=sqlite:///./flare.db

# ── Authentication ────────────────────────────────────────────
JWT_SECRET=change-this-in-production
JWT_EXPIRY_HOURS=8

# ── Data Source ───────────────────────────────────────────────
# "canvas"      → live Canvas API
# "brightspace" → live Brightspace API
# "demo"        → built-in data (default)
DATA_SOURCE=demo

# ── Ingestion ────────────────────────────────────────────────
INGESTION_INTERVAL_SECONDS=30
INGESTION_ENABLED=true
```

---

## API Reference

### Risk Engine

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students` | All students sorted by risk score |
| GET | `/students/{id}` | Single student full profile |
| GET | `/students/{id}/timeline` | Assignment timeline with status |
| GET | `/risk/all` | Risk summaries for all students |
| GET | `/risk/distribution` | Count by risk level |
| GET | `/risk/{id}` | Single student risk summary |
| GET | `/risk/{id}/explain` | Full SHAP attribution |
| GET | `/risk/{id}/projection` | 7-day trajectory |
| GET | `/risk/{id}/projection-ci` | Trajectory with confidence intervals |
| GET | `/risk/{id}/anomaly` | Acceleration anomaly detection |
| GET | `/risk/{id}/peers` | Similar behavioral profiles |
| GET | `/risk/audit/{id}` | Full prediction audit trail |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Inject a behavioral event |
```json
{ "student_id": "...", "event_type": "missed_assignment",
  "payload": { "course_id": "...", "assignment_id": "..." }}

{ "student_id": "...", "event_type": "grade_drop",
  "payload": { "course_id": "...", "new_grade": 45.0 }}

{ "student_id": "...", "event_type": "overload_added",
  "payload": { "course_name": "...", "credits": 4 }}

{ "student_id": "...", "event_type": "absence_streak",
  "payload": { "course_id": "...", "count": 5 }}
```

### AI Interventions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate/nudge/{id}` | LLM-generated student nudge |
| POST | `/generate/advisor-email/{id}` | LLM-generated advisor alert |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Returns JWT |
| POST | `/auth/logout` | Blacklists token |
| GET | `/auth/demo-accounts` | Available accounts |

### WebSocket
```
ws://localhost:8000/ws/{client_id}

Broadcast payload:
{
  type: "risk_update",
  source: "autonomous_ingestion" | "manual_event",
  student_id, student_name, major,
  old_risk_score, new_risk_score,
  risk_level, risk_flags,
  shap_explanation,
  projected_score_7d, trend, will_cross_critical,
  anomaly_detected, anomaly_severity,
  event_type, event_description,
  timestamp
}
```

---

## Prediction API

Flare exposes a standalone prediction endpoint that any
university system can integrate with:
```bash
GET /risk/{student_id}/explain

# Response:
{
  "student_id": "...",
  "risk_score": 93.0,
  "risk_level": "critical",
  "probability": 0.93,
  "explanation": [
    {
      "feature": "missed_ratio",
      "value": 0.67,
      "shap": 2.41,
      "direction": "risk",
      "human_label": "Assignment Completion"
    }
  ]
}
```

The same endpoint that powers the dashboard can power
early-warning emails, SIS integrations, advisor mobile apps,
or any system that needs explainable dropout risk scores.

---

## FERPA Compliance

Flare is designed for institutional deployment under FERPA's
school official exception:

- **No sensitive demographics** — only behavioral LMS telemetry
- **Full audit trail** — every prediction logged with SHAP values and timestamp
- **Explainable decisions** — every score has a documented mathematical reason
- **Configurable LLM** — swap Anthropic for a self-hosted model to keep data on-premises
- **Human in the loop** — Flare informs advisors, never acts autonomously on students

---

## Tech Stack

**Backend:** FastAPI · scikit-learn · SHAP · SQLAlchemy · 
Anthropic API · python-jose · uvicorn · httpx

**Frontend:** Next.js 14 · React 18 · TypeScript (strict) · 
Tailwind CSS · Recharts · Lucide React · date-fns

---

TruHacks 2026 · Aditya J Shah