"""init tables

Revision ID: 0001_init_tables
Revises:
Create Date: 2026-04-30
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = "0001_init_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "market_price_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="unknown"),
        sa.Column("change", sa.Float(), nullable=True),
        sa.Column("change_percent", sa.Float(), nullable=True),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_market_price_snapshots_symbol", "market_price_snapshots", ["symbol"])
    op.create_index("ix_market_price_snapshots_observed_at", "market_price_snapshots", ["observed_at"])
    op.create_index("ix_market_price_symbol_time", "market_price_snapshots", ["symbol", "observed_at"])

    op.create_table(
        "market_quote_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("open", sa.Float(), nullable=True),
        sa.Column("high", sa.Float(), nullable=True),
        sa.Column("low", sa.Float(), nullable=True),
        sa.Column("volume", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="unknown"),
        sa.Column("change", sa.Float(), nullable=True),
        sa.Column("change_percent", sa.Float(), nullable=True),
        sa.Column("bid", sa.Float(), nullable=True),
        sa.Column("ask", sa.Float(), nullable=True),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_market_quote_snapshots_symbol", "market_quote_snapshots", ["symbol"])
    op.create_index("ix_market_quote_snapshots_observed_at", "market_quote_snapshots", ["observed_at"])
    op.create_index("ix_market_quote_symbol_time", "market_quote_snapshots", ["symbol", "observed_at"])

    op.create_table(
        "market_historical_candles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("open", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("volume", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="alpha_vantage"),
        sa.Column("inserted_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("symbol", "timestamp", name="uq_hist_symbol_ts"),
    )
    op.create_index("ix_market_historical_candles_symbol", "market_historical_candles", ["symbol"])
    op.create_index("ix_market_historical_candles_timestamp", "market_historical_candles", ["timestamp"])
    op.create_index("ix_market_historical_candles_inserted_at", "market_historical_candles", ["inserted_at"])
    op.create_index("ix_hist_symbol_ts", "market_historical_candles", ["symbol", "timestamp"])

    op.create_table(
        "sentiment_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("overall_sentiment", sa.Float(), nullable=False),
        sa.Column("sentiment_volume", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="unknown"),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_sentiment_snapshots_symbol", "sentiment_snapshots", ["symbol"])
    op.create_index("ix_sentiment_snapshots_observed_at", "sentiment_snapshots", ["observed_at"])
    op.create_index("ix_sentiment_symbol_time", "sentiment_snapshots", ["symbol", "observed_at"])

    op.create_table(
        "sentiment_articles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("snapshot_id", sa.Integer(), sa.ForeignKey("sentiment_snapshots.id"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=False),
        sa.Column("sentiment", sa.Float(), nullable=False),
        sa.Column("keywords", mysql.JSON(), nullable=True),
    )
    op.create_index("ix_sentiment_articles_snapshot_id", "sentiment_articles", ["snapshot_id"])
    op.create_index("ix_sentiment_articles_published_at", "sentiment_articles", ["published_at"])

    op.create_table(
        "hype_score_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("hype_score", sa.Float(), nullable=False),
        sa.Column("trend", sa.String(length=20), nullable=False, server_default="stable"),
        sa.Column("sentiment_volume", sa.Float(), nullable=False),
        sa.Column("sentiment_polarity", sa.Float(), nullable=False),
        sa.Column("sentiment_velocity", sa.Float(), nullable=False),
        sa.Column("price_momentum", sa.Float(), nullable=False),
        sa.Column("price_confirmation", sa.Float(), nullable=False),
        sa.Column("anomaly_detection", sa.Float(), nullable=False),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_hype_score_snapshots_symbol", "hype_score_snapshots", ["symbol"])
    op.create_index("ix_hype_score_snapshots_observed_at", "hype_score_snapshots", ["observed_at"])
    op.create_index("ix_hype_symbol_time", "hype_score_snapshots", ["symbol", "observed_at"])

    op.create_table(
        "correlation_pair_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol1", sa.String(length=20), nullable=False),
        sa.Column("symbol2", sa.String(length=20), nullable=False),
        sa.Column("period", sa.String(length=12), nullable=False, server_default="medium"),
        sa.Column("correlation", sa.Float(), nullable=False),
        sa.Column("lead_lag", sa.String(length=20), nullable=True),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_correlation_pair_snapshots_symbol1", "correlation_pair_snapshots", ["symbol1"])
    op.create_index("ix_correlation_pair_snapshots_symbol2", "correlation_pair_snapshots", ["symbol2"])
    op.create_index("ix_correlation_pair_snapshots_period", "correlation_pair_snapshots", ["period"])
    op.create_index("ix_correlation_pair_snapshots_observed_at", "correlation_pair_snapshots", ["observed_at"])
    op.create_index("ix_corr_pair_key_time", "correlation_pair_snapshots", ["symbol1", "symbol2", "period", "observed_at"])

    op.create_table(
        "correlation_matrix_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("period", sa.String(length=12), nullable=False, server_default="medium"),
        sa.Column("symbols_key", sa.String(length=512), nullable=False),
        sa.Column("symbols", mysql.JSON(), nullable=False),
        sa.Column("matrix", mysql.JSON(), nullable=False),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_correlation_matrix_snapshots_period", "correlation_matrix_snapshots", ["period"])
    op.create_index("ix_correlation_matrix_snapshots_symbols_key", "correlation_matrix_snapshots", ["symbols_key"])
    op.create_index("ix_correlation_matrix_snapshots_observed_at", "correlation_matrix_snapshots", ["observed_at"])
    op.create_index("ix_corr_matrix_key_time", "correlation_matrix_snapshots", ["period", "symbols_key", "observed_at"])

    op.create_table(
        "feed_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("symbol", sa.String(length=20), nullable=True),
        sa.Column("kind", sa.String(length=40), nullable=False, server_default="news"),
        sa.Column("icon", sa.String(length=12), nullable=False, server_default="LIVE"),
        sa.Column("level", sa.String(length=20), nullable=False, server_default="green"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=80), nullable=False, server_default="backend"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_feed_events_symbol", "feed_events", ["symbol"])
    op.create_index("ix_feed_events_created_at", "feed_events", ["created_at"])
    op.create_index("ix_feed_created_at", "feed_events", ["created_at"])

    op.create_table(
        "user_watchlists",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False, server_default="default"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "name", name="uq_watchlist_user_name"),
    )
    op.create_index("ix_user_watchlists_user_id", "user_watchlists", ["user_id"])
    op.create_index("ix_user_watchlists_created_at", "user_watchlists", ["created_at"])
    op.create_index("ix_user_watchlists_updated_at", "user_watchlists", ["updated_at"])

    op.create_table(
        "user_watchlist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("watchlist_id", sa.Integer(), sa.ForeignKey("user_watchlists.id"), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("watchlist_id", "symbol", name="uq_watchlist_symbol"),
    )
    op.create_index("ix_user_watchlist_items_watchlist_id", "user_watchlist_items", ["watchlist_id"])
    op.create_index("ix_user_watchlist_items_symbol", "user_watchlist_items", ["symbol"])
    op.create_index("ix_user_watchlist_items_created_at", "user_watchlist_items", ["created_at"])


def downgrade() -> None:
    op.drop_table("user_watchlist_items")
    op.drop_table("user_watchlists")
    op.drop_table("feed_events")
    op.drop_table("correlation_matrix_snapshots")
    op.drop_table("correlation_pair_snapshots")
    op.drop_table("hype_score_snapshots")
    op.drop_table("sentiment_articles")
    op.drop_table("sentiment_snapshots")
    op.drop_table("market_historical_candles")
    op.drop_table("market_quote_snapshots")
    op.drop_table("market_price_snapshots")

