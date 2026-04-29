from __future__ import annotations

from typing import Iterator

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.db.core import ENGINE, SessionLocal


def get_db() -> Iterator[Session]:
    if ENGINE is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

