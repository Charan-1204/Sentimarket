from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from backend.config import settings


def _create_engine(database_url: str) -> Engine:
    # pool_pre_ping: avoids stale connections (common with RDS)
    # pool_recycle: MySQL closes idle connections; recycle before that.
    return create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=3600,
        future=True,
    )


DATABASE_URL: Optional[str] = settings.resolved_database_url
ENGINE: Optional[Engine] = _create_engine(DATABASE_URL) if DATABASE_URL else None

SessionLocal = sessionmaker(
    bind=ENGINE,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
)


@contextmanager
def session_scope() -> Iterator[Session]:
    """Provide a transactional scope for sync DB work."""
    if ENGINE is None:
        raise RuntimeError("Database is not configured (missing DATABASE_URL/DB_* env vars).")
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def db_enabled() -> bool:
    return ENGINE is not None

