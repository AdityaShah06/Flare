"""
Run this once from flare/backend/:
    python generate_artifacts.py

Produces:
    models/risk_model.joblib
    models/scaler.joblib
    models/model_metadata.json
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
import shap
import joblib
import json
import os
from datetime import datetime, timezone

# ── Create output folders ──────────────────────────────────────────────────
os.makedirs('models', exist_ok=True)

print("Generating synthetic training data...")

# ── Generate 3000 synthetic student records ────────────────────────────────
rng = np.random.default_rng(seed=42)  # seed=42 means same data every run
n   = 3000

# Each of these is one behavioral signal extracted from LMS data
missed_ratio        = rng.beta(1.5, 5.0, n)
avg_grade           = np.clip(rng.normal(74, 13, n), 0, 100)
min_grade           = np.clip(avg_grade - np.abs(rng.normal(0, 9, n)), 0, 100)
credit_hours        = rng.choice(
    [12, 13, 15, 16, 18, 19, 21], n,
    p=[0.04, 0.08, 0.30, 0.22, 0.20, 0.10, 0.06]
).astype(float)
consecutive_missed  = rng.choice(
    [0, 1, 2, 3, 4, 5], n,
    p=[0.48, 0.24, 0.13, 0.08, 0.04, 0.03]
).astype(float)
grade_variance      = rng.exponential(6.5, n)
submission_velocity = rng.poisson(3, n).astype(float)

# ── Build the target label (dropout risk = 1, on track = 0) ───────────────
# This formula encodes domain knowledge about what drives dropout
risk_logit = (
      5.5                                          # bias — shifts base rate to ~30%
    + 3.8  * missed_ratio
    - 0.065 * avg_grade
    - 0.045 * min_grade
    + 0.09  * np.maximum(0.0, credit_hours - 15.0)
    + 0.45  * consecutive_missed
    + 0.06  * grade_variance
    - 0.12  * submission_velocity
    + rng.normal(0, 0.35, n)
)
probability = 1.0 / (1.0 + np.exp(-risk_logit))
label = (rng.random(n) < probability).astype(int)

print(f"  {n} records, {label.mean():.1%} at-risk rate")

FEATURES = [
    'missed_ratio',
    'avg_grade',
    'min_grade',
    'credit_hours',
    'consecutive_missed',
    'grade_variance',
    'submission_velocity',
]

df = pd.DataFrame({
    'missed_ratio':        missed_ratio,
    'avg_grade':           avg_grade,
    'min_grade':           min_grade,
    'credit_hours':        credit_hours,
    'consecutive_missed':  consecutive_missed,
    'grade_variance':      grade_variance,
    'submission_velocity': submission_velocity,
    'dropout_risk':        label,
})

# ── Train the model ────────────────────────────────────────────────────────
print("Training GradientBoostingClassifier (300 estimators)...")

X = df[FEATURES].values
y = df['dropout_risk'].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler   = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

model = GradientBoostingClassifier(
    n_estimators=300,
    learning_rate=0.04,
    max_depth=4,
    subsample=0.8,
    min_samples_leaf=10,
    random_state=42,
)
model.fit(X_train_scaled, y_train)

test_auc = roc_auc_score(y_test, model.predict_proba(X_test_scaled)[:, 1])
print(f"  Test AUC: {test_auc:.4f}")

# ── Save model and scaler ──────────────────────────────────────────────────
print("Saving model artifacts...")

joblib.dump(model,  'models/risk_model.joblib')
joblib.dump(scaler, 'models/scaler.joblib')

metadata = {
    'model_type':       'GradientBoostingClassifier',
    'features':         FEATURES,
    'feature_count':    len(FEATURES),
    'training_samples': int(X_train.shape[0]),
    'test_samples':     int(X_test.shape[0]),
    'test_auc':         round(float(test_auc), 4),
    'hyperparameters': {
        'n_estimators':    300,
        'learning_rate':   0.04,
        'max_depth':       4,
        'subsample':       0.8,
        'min_samples_leaf':10,
    },
    'trained_at': datetime.now(timezone.utc).isoformat(),
}
with open('models/model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

# ── Verify SHAP works with this model ─────────────────────────────────────
print("Verifying SHAP explainer...")
explainer  = shap.TreeExplainer(model)
shap_vals  = explainer.shap_values(X_test_scaled[:5])
print(f"  SHAP output shape: {shap_vals.shape}")

print()
print("Done. Files created:")
print(f"  models/risk_model.joblib  ({os.path.getsize('models/risk_model.joblib')//1024} KB)")
print(f"  models/scaler.joblib")
print(f"  models/model_metadata.json")
print()
print("You can now start the backend. The model will load from disk.")