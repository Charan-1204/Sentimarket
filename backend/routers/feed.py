from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.deps import get_db
from backend.db import repo as db_repo

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("")
def get_feed(
    limit: int = Query(20, ge=1, le=200),
    symbol: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    events = db_repo.get_feed_events(db, limit=limit, symbol=symbol.upper() if symbol else None)
    return {
        "items": [
            {
                "text": e.message,
                "icon": e.icon,
                "type": e.level,
                "timeLabel": "just now",
                "createdAt": e.created_at.isoformat(),
                "symbol": e.symbol,
                "kind": e.kind,
                "source": e.source,
            }
            for e in events
        ],
        "count": len(events),
        "timestamp": datetime.utcnow().isoformat(),
    }

