from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
from backend.schemas import CorrelationPair, CorrelationMatrix
from backend.services.market_aggregator import MarketAggregator
import logging
import numpy as np
from scipy import stats
from fastapi.concurrency import run_in_threadpool

from backend.db.core import db_enabled, session_scope
from backend.db import repo as db_repo

logger = logging.getLogger(__name__)


class CorrelationEngine:
    """Calculates correlations between assets."""
    
    # Time windows for correlation analysis
    SHORT_WINDOW = 18  # hours
    MEDIUM_WINDOW = 36  # hours
    LONG_WINDOW = 72  # hours
    
    def __init__(self):
        self.market_agg = MarketAggregator()
        self._cache: Dict[str, tuple] = {}
        self._price_history: Dict[str, list] = {}
    
    def _is_cache_valid(self, key: str, ttl: int = 300) -> bool:
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
    
    def _set_cache(self, key: str, data: any, ttl: int = 300):
        """Cache data with timestamp."""
        self._cache[key] = (data, datetime.now())
    
    async def get_correlation(self, symbol1: str, symbol2: str, period: str = "medium") -> Optional[CorrelationPair]:
        """Calculate correlation between two symbols."""
        cache_key = f"correlation:{symbol1}:{symbol2}:{period}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        if db_enabled():
            try:
                def _read():
                    with session_scope() as db:
                        snap = db_repo.get_recent_corr_pair(db, symbol1, symbol2, period, ttl_seconds=300)
                        if not snap:
                            return None
                        return CorrelationPair(
                            symbol1=snap.symbol1,
                            symbol2=snap.symbol2,
                            correlation=snap.correlation,
                            period=snap.period,
                            lead_lag=snap.lead_lag,
                        )

                from_db = await run_in_threadpool(_read)
                if from_db:
                    self._set_cache(cache_key, from_db, ttl=300)
                    return from_db
            except Exception:
                pass
        
        try:
            # Get historical data for both symbols
            hist1 = await self.market_agg.get_historical(symbol1, days=7)
            hist2 = await self.market_agg.get_historical(symbol2, days=7)
            
            if not hist1 or not hist2:
                return None
            
            # Calculate correlation
            correlation = self._calculate_pearson_correlation(hist1, hist2)
            
            # Detect lead-lag relationship
            lead_lag = self._detect_lead_lag(hist1, hist2)
            
            result = CorrelationPair(
                symbol1=symbol1,
                symbol2=symbol2,
                correlation=correlation,
                period=period,
                lead_lag=lead_lag
            )
            
            self._set_cache(cache_key, result, ttl=300)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_pair(result))
                except Exception:
                    pass
            return result
        except Exception as e:
            logger.error(f"Error calculating correlation between {symbol1} and {symbol2}: {e}")
            return None
    
    async def get_correlation_matrix(self, symbols: List[str], period: str = "medium") -> Optional[CorrelationMatrix]:
        """Calculate correlation matrix for multiple symbols."""
        cache_key = f"correlation_matrix:{':'.join(sorted(symbols))}:{period}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        if db_enabled():
            try:
                # Use deterministic ordering for keying and storage.
                symbols_keyed = list(symbols)

                def _read():
                    with session_scope() as db:
                        snap = db_repo.get_recent_corr_matrix(db, symbols_keyed, period, ttl_seconds=300)
                        if not snap:
                            return None
                        return CorrelationMatrix(
                            symbols=list(snap.symbols),
                            matrix=snap.matrix,
                            period=snap.period,
                            timestamp=snap.observed_at,
                        )

                from_db = await run_in_threadpool(_read)
                if from_db:
                    self._set_cache(cache_key, from_db, ttl=300)
                    return from_db
            except Exception:
                pass
        
        try:
            # Get historical data for all symbols
            histories = {}
            for symbol in symbols:
                hist = await self.market_agg.get_historical(symbol, days=7)
                if hist:
                    histories[symbol] = hist
            
            if len(histories) < 2:
                return None
            
            # Build correlation matrix
            symbols_with_data = list(histories.keys())
            n = len(symbols_with_data)
            matrix = [[0.0] * n for _ in range(n)]
            
            for i in range(n):
                for j in range(n):
                    if i == j:
                        matrix[i][j] = 1.0
                    elif i < j:
                        corr = self._calculate_pearson_correlation(
                            histories[symbols_with_data[i]],
                            histories[symbols_with_data[j]]
                        )
                        matrix[i][j] = corr
                        matrix[j][i] = corr
            
            result = CorrelationMatrix(
                symbols=symbols_with_data,
                matrix=matrix,
                period=period,
                timestamp=datetime.now()
            )
            
            self._set_cache(cache_key, result, ttl=300)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_matrix(result))
                except Exception:
                    pass
            return result
        except Exception as e:
            logger.error(f"Error calculating correlation matrix: {e}")
            return None


def _save_pair(pair: CorrelationPair) -> None:
    with session_scope() as db:
        db_repo.save_corr_pair(db, pair)
        try:
            msg = f"Corr {pair.symbol1}/{pair.symbol2}: {pair.correlation:+.2f} ({pair.period})"
            db_repo.add_feed_event(db, msg, kind="correlation", icon="CORR", level="muted", source="correlation_engine")
        except Exception:
            pass


def _save_matrix(matrix: CorrelationMatrix) -> None:
    with session_scope() as db:
        db_repo.save_corr_matrix(db, matrix)
    
    def _calculate_pearson_correlation(self, hist1, hist2) -> float:
        """Calculate Pearson correlation coefficient."""
        try:
            # Extract closing prices
            prices1 = [h.close for h in hist1]
            prices2 = [h.close for h in hist2]
            
            # Ensure same length
            min_len = min(len(prices1), len(prices2))
            prices1 = prices1[-min_len:]
            prices2 = prices2[-min_len:]
            
            if len(prices1) < 2:
                return 0.0
            
            # Calculate correlation
            correlation = np.corrcoef(prices1, prices2)[0, 1]
            
            # Handle NaN
            if np.isnan(correlation):
                return 0.0
            
            return float(correlation)
        except Exception as e:
            logger.warning(f"Error calculating Pearson correlation: {e}")
            return 0.0
    
    def _calculate_spearman_correlation(self, hist1, hist2) -> float:
        """Calculate Spearman correlation coefficient."""
        try:
            # Extract closing prices
            prices1 = [h.close for h in hist1]
            prices2 = [h.close for h in hist2]
            
            # Ensure same length
            min_len = min(len(prices1), len(prices2))
            prices1 = prices1[-min_len:]
            prices2 = prices2[-min_len:]
            
            if len(prices1) < 2:
                return 0.0
            
            # Calculate correlation
            correlation, _ = stats.spearmanr(prices1, prices2)
            
            # Handle NaN
            if np.isnan(correlation):
                return 0.0
            
            return float(correlation)
        except Exception as e:
            logger.warning(f"Error calculating Spearman correlation: {e}")
            return 0.0
    
    def _detect_lead_lag(self, hist1, hist2) -> Optional[str]:
        """Detect if one symbol leads the other."""
        try:
            # Extract returns
            returns1 = self._calculate_returns([h.close for h in hist1])
            returns2 = self._calculate_returns([h.close for h in hist2])
            
            if len(returns1) < 2 or len(returns2) < 2:
                return None
            
            # Calculate cross-correlation at different lags
            max_lag = min(5, len(returns1) // 2)
            
            # Lag 1: symbol1 leads symbol2
            lag1_corr = np.corrcoef(returns1[:-1], returns2[1:])[0, 1] if len(returns1) > 1 else 0
            
            # Lag -1: symbol2 leads symbol1
            lag_minus1_corr = np.corrcoef(returns1[1:], returns2[:-1])[0, 1] if len(returns2) > 1 else 0
            
            # Determine lead-lag relationship
            if abs(lag1_corr) > abs(lag_minus1_corr) and lag1_corr > 0.3:
                return "symbol1_leads"
            elif abs(lag_minus1_corr) > abs(lag1_corr) and lag_minus1_corr > 0.3:
                return "symbol2_leads"
            else:
                return "none"
        except Exception as e:
            logger.warning(f"Error detecting lead-lag: {e}")
            return None
    
    def _calculate_returns(self, prices: List[float]) -> List[float]:
        """Calculate returns from prices."""
        returns = []
        for i in range(1, len(prices)):
            if prices[i-1] > 0:
                ret = (prices[i] - prices[i-1]) / prices[i-1]
                returns.append(ret)
        return returns
