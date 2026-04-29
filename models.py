"""
Backwards-compatible models module.

Canonical ORM models live in `backend/db/models.py` and are managed via Alembic.
This file re-exports the canonical models so older imports keep working.
"""

from backend.db.models import (  # noqa: F401
    Base,
    CorrelationMatrixSnapshot,
    CorrelationPairSnapshot,
    FeedEvent,
    HistoricalCandle,
    HypeScoreSnapshot,
    MarketPriceSnapshot,
    MarketQuoteSnapshot,
    SentimentArticle,
    SentimentSnapshot,
    UserWatchlist,
    UserWatchlistItem,
)
