from typing import Optional, Dict, Tuple
from datetime import datetime, timedelta
from backend.schemas import HypeScoreData, HypeFactors
from backend.services.market_aggregator import MarketAggregator
from backend.services.sentiment_aggregator import SentimentAggregator
import logging
import asyncio
from fastapi.concurrency import run_in_threadpool

from backend.db.core import db_enabled, session_scope
from backend.db import repo as db_repo

logger = logging.getLogger(__name__)


class HypeEngine:
    """Calculates hype scores based on multiple factors."""
    
    # Weighting factors (must sum to 1.0)
    WEIGHTS = {
        "sentiment_volume": 0.25,      # 25%
        "sentiment_polarity": 0.25,    # 25%
        "sentiment_velocity": 0.20,    # 20%
        "price_momentum": 0.15,        # 15%
        "price_confirmation": 0.10,    # 10%
        "anomaly_detection": 0.05      # 5%
    }
    
    # Time windows for analysis
    SHORT_WINDOW = 18  # hours
    MEDIUM_WINDOW = 36  # hours
    LONG_WINDOW = 72  # hours
    
    def __init__(self):
        self.market_agg = MarketAggregator()
        self.sentiment_agg = SentimentAggregator()
        self._cache: Dict[str, tuple] = {}
        self._historical_sentiment: Dict[str, list] = {}
    
    def _is_cache_valid(self, key: str, ttl: int = 60) -> bool:
        """Check if cached data is still valid."""
        if key not in self._cache:
            return False
        data, timestamp = self._cache[key]
        return datetime.now() - timestamp < timedelta(seconds=ttl)
    
    def _get_cached(self, key: str) -> Optional[any]:
        """Get cached data if valid."""
        if self._is_cache_valid(key):
            return self._cache[key][0]
        return None
    
    def _set_cache(self, key: str, data: any, ttl: int = 60):
        """Cache data with timestamp."""
        self._cache[key] = (data, datetime.now())
    
    async def calculate_hype_score(self, symbol: str) -> Optional[HypeScoreData]:
        """Calculate comprehensive hype score for a symbol."""
        cache_key = f"hype:{symbol}"
        cached = self._get_cached(cache_key, ttl=60)
        if cached:
            return cached

        if db_enabled():
            try:
                def _read():
                    with session_scope() as db:
                        snap = db_repo.get_recent_hype(db, symbol, ttl_seconds=60)
                        if not snap:
                            return None
                        factors = HypeFactors(
                            sentiment_volume=snap.sentiment_volume,
                            sentiment_polarity=snap.sentiment_polarity,
                            sentiment_velocity=snap.sentiment_velocity,
                            price_momentum=snap.price_momentum,
                            price_confirmation=snap.price_confirmation,
                            anomaly_detection=snap.anomaly_detection,
                        )
                        return HypeScoreData(
                            symbol=snap.symbol,
                            hype_score=snap.hype_score,
                            factors=factors,
                            trend=snap.trend,
                            timestamp=snap.observed_at,
                        )

                from_db = await run_in_threadpool(_read)
                if from_db:
                    self._set_cache(cache_key, from_db, ttl=60)
                    return from_db
            except Exception:
                pass
        
        try:
            # Gather data concurrently
            sentiment_data, quote_data, historical_data = await asyncio.gather(
                self.sentiment_agg.get_sentiment(symbol),
                self.market_agg.get_quote(symbol),
                self.market_agg.get_historical(symbol, days=7),
                return_exceptions=True
            )
            
            # Calculate individual factors
            sentiment_volume_score = self._calculate_sentiment_volume(sentiment_data)
            sentiment_polarity_score = self._calculate_sentiment_polarity(sentiment_data)
            sentiment_velocity_score = self._calculate_sentiment_velocity(symbol, sentiment_data)
            price_momentum_score = self._calculate_price_momentum(historical_data)
            price_confirmation_score = self._calculate_price_confirmation(
                sentiment_data, quote_data, historical_data
            )
            anomaly_score = self._calculate_anomaly_detection(historical_data)
            
            # Create factors object
            factors = HypeFactors(
                sentiment_volume=sentiment_volume_score,
                sentiment_polarity=sentiment_polarity_score,
                sentiment_velocity=sentiment_velocity_score,
                price_momentum=price_momentum_score,
                price_confirmation=price_confirmation_score,
                anomaly_detection=anomaly_score
            )
            
            # Calculate weighted hype score (0-100)
            hype_score = (
                sentiment_volume_score * self.WEIGHTS["sentiment_volume"] +
                sentiment_polarity_score * self.WEIGHTS["sentiment_polarity"] +
                sentiment_velocity_score * self.WEIGHTS["sentiment_velocity"] +
                price_momentum_score * self.WEIGHTS["price_momentum"] +
                price_confirmation_score * self.WEIGHTS["price_confirmation"] +
                anomaly_score * self.WEIGHTS["anomaly_detection"]
            ) * 100
            
            # Determine trend
            trend = self._determine_trend(hype_score)
            
            result = HypeScoreData(
                symbol=symbol,
                hype_score=max(0, min(100, hype_score)),  # Clamp to 0-100
                factors=factors,
                trend=trend,
                timestamp=datetime.now()
            )
            
            self._set_cache(cache_key, result, ttl=60)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_hype(symbol, result))
                except Exception:
                    pass
            return result
        except Exception as e:
            logger.error(f"Error calculating hype score for {symbol}: {e}")
            return None


def _save_hype(symbol: str, hype: HypeScoreData) -> None:
    with session_scope() as db:
        db_repo.save_hype(db, symbol, hype)
        try:
            msg = f"{symbol} hype {hype.hype_score:.1f}/100 ({hype.trend})"
            icon = "HYPE"
            level = "green" if hype.hype_score >= 60 else "orange" if hype.hype_score <= 40 else "muted"
            db_repo.add_feed_event(db, msg, symbol=symbol, kind="hype", icon=icon, level=level, source="hype_engine")
        except Exception:
            pass
    
    def _calculate_sentiment_volume(self, sentiment_data) -> float:
        """Calculate sentiment volume factor (0-1)."""
        if not sentiment_data:
            return 0.0
        
        # Normalize article count (assume 50 articles = max)
        volume_score = min(1.0, sentiment_data.sentiment_volume / 50)
        return volume_score
    
    def _calculate_sentiment_polarity(self, sentiment_data) -> float:
        """Calculate sentiment polarity factor (0-1)."""
        if not sentiment_data:
            return 0.5  # Neutral
        
        # Convert -1 to 1 range to 0 to 1 range
        polarity = (sentiment_data.overall_sentiment + 1) / 2
        return max(0.0, min(1.0, polarity))
    
    def _calculate_sentiment_velocity(self, symbol: str, sentiment_data) -> float:
        """Calculate sentiment velocity (rate of change)."""
        if not sentiment_data:
            return 0.5
        
        # Track historical sentiment
        if symbol not in self._historical_sentiment:
            self._historical_sentiment[symbol] = []
        
        current_sentiment = sentiment_data.overall_sentiment
        self._historical_sentiment[symbol].append({
            "sentiment": current_sentiment,
            "timestamp": datetime.now()
        })
        
        # Keep only last 24 hours
        cutoff = datetime.now() - timedelta(hours=24)
        self._historical_sentiment[symbol] = [
            s for s in self._historical_sentiment[symbol]
            if s["timestamp"] > cutoff
        ]
        
        if len(self._historical_sentiment[symbol]) < 2:
            return 0.5
        
        # Calculate velocity (change per hour)
        recent = self._historical_sentiment[symbol][-1]["sentiment"]
        oldest = self._historical_sentiment[symbol][0]["sentiment"]
        hours_elapsed = (
            (datetime.now() - self._historical_sentiment[symbol][0]["timestamp"]).total_seconds() / 3600
        )
        
        if hours_elapsed == 0:
            return 0.5
        
        velocity = (recent - oldest) / hours_elapsed
        # Normalize to 0-1 range (assume ±1 per hour is extreme)
        velocity_score = (velocity + 1) / 2
        return max(0.0, min(1.0, velocity_score))
    
    def _calculate_price_momentum(self, historical_data) -> float:
        """Calculate price momentum factor."""
        if not historical_data or len(historical_data) < 2:
            return 0.5
        
        # Calculate returns over different windows
        recent = historical_data[-1].close
        
        # Short-term momentum (last 1-2 days)
        short_start = historical_data[0].close if len(historical_data) >= 2 else recent
        short_return = (recent - short_start) / short_start if short_start > 0 else 0
        
        # Normalize to 0-1 range (assume ±10% is extreme)
        momentum_score = (short_return / 0.1 + 1) / 2
        return max(0.0, min(1.0, momentum_score))
    
    def _calculate_price_confirmation(self, sentiment_data, quote_data, historical_data) -> float:
        """Calculate price confirmation (sentiment-price alignment)."""
        if not sentiment_data or not quote_data or not historical_data:
            return 0.5
        
        # Get sentiment direction
        sentiment_direction = 1 if sentiment_data.overall_sentiment > 0 else -1 if sentiment_data.overall_sentiment < 0 else 0
        
        # Get price direction
        if len(historical_data) >= 2:
            price_direction = 1 if historical_data[-1].close > historical_data[0].close else -1
        else:
            price_direction = 0
        
        # Check alignment
        if sentiment_direction == 0 or price_direction == 0:
            return 0.5
        
        alignment = 1.0 if sentiment_direction == price_direction else 0.0
        return alignment
    
    def _calculate_anomaly_detection(self, historical_data) -> float:
        """Detect price anomalies (unusual volatility or movement)."""
        if not historical_data or len(historical_data) < 3:
            return 0.5
        
        # Calculate returns
        returns = []
        for i in range(1, len(historical_data)):
            prev_close = historical_data[i-1].close
            curr_close = historical_data[i].close
            if prev_close > 0:
                returns.append((curr_close - prev_close) / prev_close)
        
        if not returns:
            return 0.5
        
        # Calculate volatility
        avg_return = sum(returns) / len(returns)
        variance = sum((r - avg_return) ** 2 for r in returns) / len(returns)
        volatility = variance ** 0.5
        
        # Normalize volatility (assume 5% daily volatility is high)
        anomaly_score = min(1.0, volatility / 0.05)
        return anomaly_score
    
    def _determine_trend(self, hype_score: float) -> str:
        """Determine trend based on hype score."""
        if hype_score >= 60:
            return "rising"
        elif hype_score <= 40:
            return "falling"
        else:
            return "stable"
