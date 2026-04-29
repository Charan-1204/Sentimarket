from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db import models


def _cutoff(seconds: int) -> datetime:
    return datetime.utcnow() - timedelta(seconds=seconds)


# -------- Market --------
def get_recent_price(db: Session, symbol: str, ttl_seconds: int) -> Optional[models.MarketPriceSnapshot]:
    stmt = (
        select(models.MarketPriceSnapshot)
        .where(models.MarketPriceSnapshot.symbol == symbol)
        .where(models.MarketPriceSnapshot.observed_at >= _cutoff(ttl_seconds))
        .order_by(desc(models.MarketPriceSnapshot.observed_at))
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def save_price(db: Session, symbol: str, data) -> None:
    db.add(
        models.MarketPriceSnapshot(
            symbol=symbol,
            price=data.price,
            currency=getattr(data, "currency", "USD") or "USD",
            provider=getattr(data, "provider", "unknown") or "unknown",
            change=getattr(data, "change", None),
            change_percent=getattr(data, "change_percent", None),
            observed_at=getattr(data, "timestamp", None) or datetime.utcnow(),
        )
    )


def get_recent_quote(db: Session, symbol: str, ttl_seconds: int) -> Optional[models.MarketQuoteSnapshot]:
    stmt = (
        select(models.MarketQuoteSnapshot)
        .where(models.MarketQuoteSnapshot.symbol == symbol)
        .where(models.MarketQuoteSnapshot.observed_at >= _cutoff(ttl_seconds))
        .order_by(desc(models.MarketQuoteSnapshot.observed_at))
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def save_quote(db: Session, symbol: str, data) -> None:
    db.add(
        models.MarketQuoteSnapshot(
            symbol=symbol,
            price=data.price,
            open=getattr(data, "open", None),
            high=getattr(data, "high", None),
            low=getattr(data, "low", None),
            volume=getattr(data, "volume", None),
            provider=getattr(data, "provider", "unknown") or "unknown",
            change=getattr(data, "change", None),
            change_percent=getattr(data, "change_percent", None),
            bid=getattr(data, "bid", None),
            ask=getattr(data, "ask", None),
            observed_at=getattr(data, "timestamp", None) or datetime.utcnow(),
        )
    )


def get_historical_candles(db: Session, symbol: str, days: int) -> List[models.HistoricalCandle]:
    stmt = (
        select(models.HistoricalCandle)
        .where(models.HistoricalCandle.symbol == symbol)
        .order_by(desc(models.HistoricalCandle.timestamp))
        .limit(days)
    )
    rows = list(db.execute(stmt).scalars().all())
    return list(reversed(rows))


def upsert_historical_candles(db: Session, symbol: str, candles, provider: str = "alpha_vantage") -> None:
    for candle in candles:
        # Use a SAVEPOINT per row so duplicates don't nuke the whole batch.
        with db.begin_nested():
            db.add(
                models.HistoricalCandle(
                    symbol=symbol,
                    timestamp=candle.timestamp,
                    open=candle.open,
                    high=candle.high,
                    low=candle.low,
                    close=candle.close,
                    volume=candle.volume,
                    provider=provider,
                    inserted_at=datetime.utcnow(),
                )
            )
            try:
                db.flush()
            except IntegrityError:
                pass


# -------- Sentiment --------
def get_recent_sentiment(db: Session, symbol: str, ttl_seconds: int) -> Optional[models.SentimentSnapshot]:
    stmt = (
        select(models.SentimentSnapshot)
        .where(models.SentimentSnapshot.symbol == symbol)
        .where(models.SentimentSnapshot.observed_at >= _cutoff(ttl_seconds))
        .order_by(desc(models.SentimentSnapshot.observed_at))
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def save_sentiment(db: Session, symbol: str, sentiment_data) -> models.SentimentSnapshot:
    snap = models.SentimentSnapshot(
        symbol=symbol,
        overall_sentiment=sentiment_data.overall_sentiment,
        sentiment_volume=sentiment_data.sentiment_volume,
        provider=getattr(sentiment_data, "provider", "unknown") or "unknown",
        observed_at=getattr(sentiment_data, "timestamp", None) or datetime.utcnow(),
    )
    for article in sentiment_data.recent_articles or []:
        snap.articles.append(
            models.SentimentArticle(
                title=article.title,
                source=article.source,
                url=article.url,
                published_at=article.published_at,
                sentiment=article.sentiment,
                keywords=list(getattr(article, "keywords", []) or []),
            )
        )
    db.add(snap)
    db.flush()
    return snap


# -------- Hype --------
def get_recent_hype(db: Session, symbol: str, ttl_seconds: int) -> Optional[models.HypeScoreSnapshot]:
    stmt = (
        select(models.HypeScoreSnapshot)
        .where(models.HypeScoreSnapshot.symbol == symbol)
        .where(models.HypeScoreSnapshot.observed_at >= _cutoff(ttl_seconds))
        .order_by(desc(models.HypeScoreSnapshot.observed_at))
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def save_hype(db: Session, symbol: str, hype_data) -> None:
    f = hype_data.factors
    db.add(
        models.HypeScoreSnapshot(
            symbol=symbol,
            hype_score=hype_data.hype_score,
            trend=hype_data.trend,
            sentiment_volume=f.sentiment_volume,
            sentiment_polarity=f.sentiment_polarity,
            sentiment_velocity=f.sentiment_velocity,
            price_momentum=f.price_momentum,
            price_confirmation=f.price_confirmation,
            anomaly_detection=f.anomaly_detection,
            observed_at=getattr(hype_data, "timestamp", None) or datetime.utcnow(),
        )
    )


# -------- Correlations --------
def get_recent_corr_pair(
    db: Session,
    symbol1: str,
    symbol2: str,
    period: str,
    ttl_seconds: int,
) -> Optional[models.CorrelationPairSnapshot]:
    stmt = (
        select(models.CorrelationPairSnapshot)
        .where(models.CorrelationPairSnapshot.symbol1 == symbol1)
        .where(models.CorrelationPairSnapshot.symbol2 == symbol2)
        .where(models.CorrelationPairSnapshot.period == period)
        .where(models.CorrelationPairSnapshot.observed_at >= _cutoff(ttl_seconds))
        .order_by(desc(models.CorrelationPairSnapshot.observed_at))
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def save_corr_pair(db: Session, corr_pair) -> None:
    db.add(
        models.CorrelationPairSnapshot(
            symbol1=corr_pair.symbol1,
            symbol2=corr_pair.symbol2,
            period=corr_pair.period,
            correlation=corr_pair.correlation,
            lead_lag=corr_pair.lead_lag,
            observed_at=getattr(corr_pair, "timestamp", None) or datetime.utcnow(),
        )
    )


def get_recent_corr_matrix(db: Session, symbols: List[str], period: str, ttl_seconds: int) -> Optional[models.CorrelationMatrixSnapshot]:
    symbols_key = ":".join(symbols)
    stmt = (
        select(models.CorrelationMatrixSnapshot)
        .where(models.CorrelationMatrixSnapshot.period == period)
        .where(models.CorrelationMatrixSnapshot.symbols_key == symbols_key)
        .where(models.CorrelationMatrixSnapshot.observed_at >= _cutoff(ttl_seconds))
        .order_by(desc(models.CorrelationMatrixSnapshot.observed_at))
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def save_corr_matrix(db: Session, matrix) -> None:
    symbols = list(matrix.symbols)
    db.add(
        models.CorrelationMatrixSnapshot(
            period=matrix.period,
            symbols_key=":".join(symbols),
            symbols=symbols,
            matrix=matrix.matrix,
            observed_at=getattr(matrix, "timestamp", None) or datetime.utcnow(),
        )
    )


# -------- Feed --------
def add_feed_event(db: Session, message: str, *, symbol: Optional[str] = None, kind: str = "news", icon: str = "LIVE", level: str = "green", source: str = "backend") -> None:
    db.add(
        models.FeedEvent(
            symbol=symbol,
            kind=kind,
            icon=icon,
            level=level,
            message=message,
            source=source,
            created_at=datetime.utcnow(),
        )
    )


def get_feed_events(db: Session, limit: int = 20, symbol: Optional[str] = None) -> List[models.FeedEvent]:
    stmt = select(models.FeedEvent).order_by(desc(models.FeedEvent.created_at)).limit(limit)
    if symbol:
        stmt = stmt.where(models.FeedEvent.symbol == symbol)
    return list(db.execute(stmt).scalars().all())


# -------- Watchlists --------
def get_or_create_watchlist(db: Session, user_id: str, name: str = "default") -> models.UserWatchlist:
    stmt = (
        select(models.UserWatchlist)
        .where(models.UserWatchlist.user_id == user_id)
        .where(models.UserWatchlist.name == name)
        .limit(1)
    )
    wl = db.execute(stmt).scalar_one_or_none()
    if wl:
        return wl
    wl = models.UserWatchlist(user_id=user_id, name=name, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(wl)
    db.flush()
    return wl


def list_watchlists(db: Session, user_id: str) -> List[models.UserWatchlist]:
    stmt = select(models.UserWatchlist).where(models.UserWatchlist.user_id == user_id).order_by(desc(models.UserWatchlist.updated_at))
    return list(db.execute(stmt).scalars().all())


def set_watchlist_symbols(db: Session, user_id: str, symbols: List[str], name: str = "default") -> models.UserWatchlist:
    wl = get_or_create_watchlist(db, user_id=user_id, name=name)
    wl.updated_at = datetime.utcnow()
    want = {s.upper() for s in symbols if s}
    have = {item.symbol.upper(): item for item in wl.items}

    # Remove items not wanted
    for sym, item in list(have.items()):
        if sym not in want:
            wl.items.remove(item)

    # Add missing
    for sym in sorted(want):
        if sym not in have:
            wl.items.append(models.UserWatchlistItem(symbol=sym, created_at=datetime.utcnow()))

    db.add(wl)
    db.flush()
    return wl
