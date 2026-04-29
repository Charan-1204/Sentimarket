"""
Backwards-compatible DB module.

The FastAPI backend uses `backend/db/core.py`. Keep this file as a thin re-export so
older scripts (e.g. `test_db.py`) keep working.
"""

from backend.db.core import ENGINE as engine, SessionLocal  # noqa: F401
