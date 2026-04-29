from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db.deps import get_db
from backend.db import repo as db_repo

router = APIRouter(prefix="/api/watchlists", tags=["watchlists"])


class WatchlistUpdate(BaseModel):
    symbols: List[str]


@router.get("/{user_id}")
def list_watchlists(
    user_id: str,
    db: Session = Depends(get_db),
):
    watchlists = db_repo.list_watchlists(db, user_id=user_id)
    return {
        "user_id": user_id,
        "watchlists": [
            {
                "name": wl.name,
                "symbols": [i.symbol for i in wl.items],
                "updated_at": wl.updated_at.isoformat(),
            }
            for wl in watchlists
        ],
        "count": len(watchlists),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.put("/{user_id}")
def set_watchlist(
    user_id: str,
    payload: WatchlistUpdate,
    name: str = Query("default"),
    db: Session = Depends(get_db),
):
    wl = db_repo.set_watchlist_symbols(db, user_id=user_id, symbols=payload.symbols, name=name)
    return {
        "user_id": user_id,
        "name": wl.name,
        "symbols": [i.symbol for i in wl.items],
        "updated_at": wl.updated_at.isoformat(),
        "timestamp": datetime.utcnow().isoformat(),
    }

