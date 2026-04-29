from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.dialects.mysql import JSON as MySQLJSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class MarketPriceSnapshot(Base):
    __tablename__ = "market_price_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    price: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    provider: Mapped[str] = mapped_column(String(40), default="unknown")
    change: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_market_price_symbol_time", "symbol", "observed_at"),
    )


class MarketQuoteSnapshot(Base):
    __tablename__ = "market_quote_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    price: Mapped[float] = mapped_column(Float)
    open: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    high: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    low: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    volume: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    provider: Mapped[str] = mapped_column(String(40), default="unknown")
    change: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bid: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ask: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_market_quote_symbol_time", "symbol", "observed_at"),
    )


class HistoricalCandle(Base):
    __tablename__ = "market_historical_candles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    open: Mapped[float] = mapped_column(Float)
    high: Mapped[float] = mapped_column(Float)
    low: Mapped[float] = mapped_column(Float)
    close: Mapped[float] = mapped_column(Float)
    volume: Mapped[int] = mapped_column(Integer)
    provider: Mapped[str] = mapped_column(String(40), default="alpha_vantage")
    inserted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        UniqueConstraint("symbol", "timestamp", name="uq_hist_symbol_ts"),
        Index("ix_hist_symbol_ts", "symbol", "timestamp"),
    )


class SentimentSnapshot(Base):
    __tablename__ = "sentiment_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    overall_sentiment: Mapped[float] = mapped_column(Float)
    sentiment_volume: Mapped[int] = mapped_column(Integer)
    provider: Mapped[str] = mapped_column(String(40), default="unknown")
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    articles: Mapped[list["SentimentArticle"]] = relationship(
        "SentimentArticle",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_sentiment_symbol_time", "symbol", "observed_at"),
    )


class SentimentArticle(Base):
    __tablename__ = "sentiment_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("sentiment_snapshots.id"), index=True)
    title: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(120))
    url: Mapped[str] = mapped_column(Text)
    published_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    sentiment: Mapped[float] = mapped_column(Float)
    keywords: Mapped[Optional[object]] = mapped_column(MySQLJSON, nullable=True)

    snapshot: Mapped["SentimentSnapshot"] = relationship("SentimentSnapshot", back_populates="articles")


class HypeScoreSnapshot(Base):
    __tablename__ = "hype_score_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    hype_score: Mapped[float] = mapped_column(Float)
    trend: Mapped[str] = mapped_column(String(20), default="stable")

    sentiment_volume: Mapped[float] = mapped_column(Float)
    sentiment_polarity: Mapped[float] = mapped_column(Float)
    sentiment_velocity: Mapped[float] = mapped_column(Float)
    price_momentum: Mapped[float] = mapped_column(Float)
    price_confirmation: Mapped[float] = mapped_column(Float)
    anomaly_detection: Mapped[float] = mapped_column(Float)

    observed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_hype_symbol_time", "symbol", "observed_at"),
    )


class CorrelationPairSnapshot(Base):
    __tablename__ = "correlation_pair_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol1: Mapped[str] = mapped_column(String(20), index=True)
    symbol2: Mapped[str] = mapped_column(String(20), index=True)
    period: Mapped[str] = mapped_column(String(12), default="medium", index=True)
    correlation: Mapped[float] = mapped_column(Float)
    lead_lag: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_corr_pair_key_time", "symbol1", "symbol2", "period", "observed_at"),
    )


class CorrelationMatrixSnapshot(Base):
    __tablename__ = "correlation_matrix_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    period: Mapped[str] = mapped_column(String(12), default="medium", index=True)
    symbols_key: Mapped[str] = mapped_column(String(512), index=True)
    symbols: Mapped[object] = mapped_column(MySQLJSON)
    matrix: Mapped[object] = mapped_column(MySQLJSON)
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_corr_matrix_key_time", "period", "symbols_key", "observed_at"),
    )


class FeedEvent(Base):
    __tablename__ = "feed_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(40), default="news")
    icon: Mapped[str] = mapped_column(String(12), default="LIVE")
    level: Mapped[str] = mapped_column(String(20), default="green")
    message: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(80), default="backend")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_feed_created_at", "created_at"),
    )


class UserWatchlist(Base):
    __tablename__ = "user_watchlists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(120), default="default")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    items: Mapped[list["UserWatchlistItem"]] = relationship(
        "UserWatchlistItem",
        back_populates="watchlist",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_watchlist_user_name"),
    )


class UserWatchlistItem(Base):
    __tablename__ = "user_watchlist_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    watchlist_id: Mapped[int] = mapped_column(ForeignKey("user_watchlists.id"), index=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    watchlist: Mapped["UserWatchlist"] = relationship("UserWatchlist", back_populates="items")

    __table_args__ = (
        UniqueConstraint("watchlist_id", "symbol", name="uq_watchlist_symbol"),
    )
