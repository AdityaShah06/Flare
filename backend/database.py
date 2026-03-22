"""
Flare persistence layer.

Uses SQLAlchemy with SQLite for local development and demo mode.
Defaults to in-memory SQLite (sqlite:///:memory:) so the database
resets on every restart — useful during demos and testing.

For persistent storage set DATABASE_URL=sqlite:///./flare.db in .env.

Every risk prediction, SHAP attribution, and trajectory projection
is logged to the risk_events table, creating a full audit trail
required for FERPA compliance in institutional deployments.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///:memory:")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
