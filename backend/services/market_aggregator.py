import httpx
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from backend.config import settings
from backend.schemas import PriceData, QuoteData, HistoricalData
import logging
from fastapi.concurrency import run_in_threadpool

from backend.db.core import db_enabled, session_scope
from backend.db import repo as db_repo

logger = logging.getLogger(__name__)


class MarketAggregator:
    """Aggregates market data from multiple providers with fallback logic."""
    
    def __init__(self):
        self.finnhub_url = settings.finnhub_base_url
        self.alpha_vantage_url = settings.alpha_vantage_base_url
        self.crypto_compare_url = settings.crypto_compare_base_url
        self.timeout = settings.request_timeout
        self._cache: Dict[str, tuple] = {}  # (data, timestamp)
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid."""
        if key not in self._cache:
            return False
        data, timestamp = self._cache[key]
        return datetime.now() - timestamp < timedelta(seconds=settings.market_cache_ttl)
    
    def _get_cached(self, key: str) -> Optional[Any]:
        """Get cached data if valid."""
        if self._is_cache_valid(key):
            return self._cache[key][0]
        return None
    
    def _set_cache(self, key: str, data: Any):
        """Cache data with timestamp."""
        self._cache[key] = (data, datetime.now())
    
    async def get_price(self, symbol: str) -> Optional[PriceData]:
        """Get current price from primary provider with fallback."""
        cache_key = f"price:{symbol}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        if db_enabled():
            try:
                def _read():
                    with session_scope() as db:
                        return db_repo.get_recent_price(db, symbol, settings.market_cache_ttl)

                snap = await run_in_threadpool(_read)
                if snap:
                    price = PriceData(
                        symbol=snap.symbol,
                        price=snap.price,
                        currency=snap.currency,
                        timestamp=snap.observed_at,
                        provider=snap.provider,
                        change=snap.change,
                        change_percent=snap.change_percent,
                    )
                    self._set_cache(cache_key, price)
                    return price
            except Exception:
                # DB is best-effort; fall back to live providers.
                pass
        
        # Try Finnhub first
        price = await self._get_price_finnhub(symbol)
        if price:
            self._set_cache(cache_key, price)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_price(symbol, price))
                except Exception:
                    pass
            return price
        
        # Fallback to Alpha Vantage
        price = await self._get_price_alpha_vantage(symbol)
        if price:
            self._set_cache(cache_key, price)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_price(symbol, price))
                except Exception:
                    pass
            return price
        
        # Fallback to CryptoCompare (for crypto)
        price = await self._get_price_crypto_compare(symbol)
        if price:
            self._set_cache(cache_key, price)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_price(symbol, price))
                except Exception:
                    pass
            return price
        
        logger.error(f"Failed to get price for {symbol} from all providers")
        return None
    
    async def _get_price_finnhub(self, symbol: str) -> Optional[PriceData]:
        """Get price from Finnhub."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.finnhub_url}/quote",
                    params={"symbol": symbol, "token": settings.finnhub_api_key}
                )
                response.raise_for_status()
                data = response.json()
                
                if "c" in data and data["c"] > 0:
                    return PriceData(
                        symbol=symbol,
                        price=data["c"],
                        change=data.get("d"),
                        change_percent=data.get("dp"),
                        timestamp=datetime.now(),
                        provider="finnhub"
                    )
        except Exception as e:
            logger.warning(f"Finnhub price fetch failed for {symbol}: {e}")
        return None
    
    async def _get_price_alpha_vantage(self, symbol: str) -> Optional[PriceData]:
        """Get price from Alpha Vantage."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.alpha_vantage_url,
                    params={
                        "function": "GLOBAL_QUOTE",
                        "symbol": symbol,
                        "apikey": settings.alpha_vantage_api_key
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                quote = data.get("Global Quote", {})
                if "05. price" in quote and float(quote["05. price"]) > 0:
                    return PriceData(
                        symbol=symbol,
                        price=float(quote["05. price"]),
                        change=float(quote.get("09. change", 0)),
                        change_percent=float(quote.get("10. change percent", "0").rstrip("%")),
                        timestamp=datetime.now(),
                        provider="alpha_vantage"
                    )
        except Exception as e:
            logger.warning(f"Alpha Vantage price fetch failed for {symbol}: {e}")
        return None
    
    async def _get_price_crypto_compare(self, symbol: str) -> Optional[PriceData]:
        """Get price from CryptoCompare (crypto only)."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.crypto_compare_url}/price",
                    params={
                        "fsym": symbol,
                        "tsyms": "USD",
                        "api_key": settings.crypto_compare_api_key
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                if "USD" in data and data["USD"] > 0:
                    return PriceData(
                        symbol=symbol,
                        price=data["USD"],
                        timestamp=datetime.now(),
                        provider="crypto_compare"
                    )
        except Exception as e:
            logger.warning(f"CryptoCompare price fetch failed for {symbol}: {e}")
        return None
    
    async def get_quote(self, symbol: str) -> Optional[QuoteData]:
        """Get extended quote data."""
        cache_key = f"quote:{symbol}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        if db_enabled():
            try:
                def _read():
                    with session_scope() as db:
                        return db_repo.get_recent_quote(db, symbol, settings.market_cache_ttl)

                snap = await run_in_threadpool(_read)
                if snap:
                    quote = QuoteData(
                        symbol=snap.symbol,
                        price=snap.price,
                        open=snap.open,
                        high=snap.high,
                        low=snap.low,
                        volume=snap.volume,
                        timestamp=snap.observed_at,
                        provider=snap.provider,
                        change=snap.change,
                        change_percent=snap.change_percent,
                        bid=snap.bid,
                        ask=snap.ask,
                    )
                    self._set_cache(cache_key, quote)
                    return quote
            except Exception:
                pass
        
        # Try Finnhub first
        quote = await self._get_quote_finnhub(symbol)
        if quote:
            self._set_cache(cache_key, quote)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_quote(symbol, quote))
                except Exception:
                    pass
            return quote
        
        # Fallback to Alpha Vantage
        quote = await self._get_quote_alpha_vantage(symbol)
        if quote:
            self._set_cache(cache_key, quote)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_quote(symbol, quote))
                except Exception:
                    pass
            return quote
        
        logger.error(f"Failed to get quote for {symbol} from all providers")
        return None
    
    async def _get_quote_finnhub(self, symbol: str) -> Optional[QuoteData]:
        """Get quote from Finnhub."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.finnhub_url}/quote",
                    params={"symbol": symbol, "token": settings.finnhub_api_key}
                )
                response.raise_for_status()
                data = response.json()
                
                if "c" in data and data["c"] > 0:
                    return QuoteData(
                        symbol=symbol,
                        price=data["c"],
                        open=data.get("o"),
                        high=data.get("h"),
                        low=data.get("l"),
                        volume=data.get("v"),
                        change=data.get("d"),
                        change_percent=data.get("dp"),
                        timestamp=datetime.now(),
                        provider="finnhub"
                    )
        except Exception as e:
            logger.warning(f"Finnhub quote fetch failed for {symbol}: {e}")
        return None
    
    async def _get_quote_alpha_vantage(self, symbol: str) -> Optional[QuoteData]:
        """Get quote from Alpha Vantage."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.alpha_vantage_url,
                    params={
                        "function": "GLOBAL_QUOTE",
                        "symbol": symbol,
                        "apikey": settings.alpha_vantage_api_key
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                quote = data.get("Global Quote", {})
                if "05. price" in quote and float(quote["05. price"]) > 0:
                    return QuoteData(
                        symbol=symbol,
                        price=float(quote["05. price"]),
                        open=float(quote.get("02. open", 0)) or None,
                        high=float(quote.get("03. high", 0)) or None,
                        low=float(quote.get("04. low", 0)) or None,
                        volume=int(quote.get("06. volume", 0)) or None,
                        change=float(quote.get("09. change", 0)),
                        change_percent=float(quote.get("10. change percent", "0").rstrip("%")),
                        timestamp=datetime.now(),
                        provider="alpha_vantage"
                    )
        except Exception as e:
            logger.warning(f"Alpha Vantage quote fetch failed for {symbol}: {e}")
        return None
    
    async def get_historical(self, symbol: str, days: int = 30) -> Optional[List[HistoricalData]]:
        """Get historical data."""
        cache_key = f"historical:{symbol}:{days}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        if db_enabled():
            try:
                def _read():
                    with session_scope() as db:
                        candles = db_repo.get_historical_candles(db, symbol, days)
                        return [
                            HistoricalData(
                                timestamp=c.timestamp,
                                open=c.open,
                                high=c.high,
                                low=c.low,
                                close=c.close,
                                volume=c.volume,
                            )
                            for c in candles
                        ]

                rows = await run_in_threadpool(_read)
                if rows and len(rows) >= min(days, 2):
                    self._set_cache(cache_key, rows)
                    return rows
            except Exception:
                pass
        
        # Try Alpha Vantage first
        history = await self._get_historical_alpha_vantage(symbol, days)
        if history:
            self._set_cache(cache_key, history)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _upsert_history(symbol, history))
                except Exception:
                    pass
            return history
        
        logger.error(f"Failed to get historical data for {symbol}")
        return None


def _save_price(symbol: str, price: PriceData) -> None:
    with session_scope() as db:
        db_repo.save_price(db, symbol, price)


def _save_quote(symbol: str, quote: QuoteData) -> None:
    with session_scope() as db:
        db_repo.save_quote(db, symbol, quote)


def _upsert_history(symbol: str, history: List[HistoricalData]) -> None:
    with session_scope() as db:
        db_repo.upsert_historical_candles(db, symbol, history)
    
    async def _get_historical_alpha_vantage(self, symbol: str, days: int) -> Optional[List[HistoricalData]]:
        """Get historical data from Alpha Vantage."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    self.alpha_vantage_url,
                    params={
                        "function": "TIME_SERIES_DAILY",
                        "symbol": symbol,
                        "outputsize": "full",
                        "apikey": settings.alpha_vantage_api_key
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                time_series = data.get("Time Series (Daily)", {})
                if not time_series:
                    return None
                
                history = []
                count = 0
                for date_str, ohlcv in sorted(time_series.items(), reverse=True):
                    if count >= days:
                        break
                    try:
                        history.append(HistoricalData(
                            timestamp=datetime.strptime(date_str, "%Y-%m-%d"),
                            open=float(ohlcv["1. open"]),
                            high=float(ohlcv["2. high"]),
                            low=float(ohlcv["3. low"]),
                            close=float(ohlcv["4. close"]),
                            volume=int(ohlcv["5. volume"])
                        ))
                        count += 1
                    except (ValueError, KeyError):
                        continue
                
                return sorted(history, key=lambda x: x.timestamp)
        except Exception as e:
            logger.warning(f"Alpha Vantage historical fetch failed for {symbol}: {e}")
        return None
    
    async def get_batch_prices(self, symbols: List[str]) -> List[PriceData]:
        """Get prices for multiple symbols concurrently."""
        tasks = [self.get_price(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]
