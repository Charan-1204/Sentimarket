import httpx
import asyncio
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
from backend.config import settings
from backend.schemas import SentimentData, NewsArticle
import logging
import re
from fastapi.concurrency import run_in_threadpool

from backend.db.core import db_enabled, session_scope
from backend.db import repo as db_repo

logger = logging.getLogger(__name__)


class SentimentAggregator:
    """Aggregates sentiment data from multiple news sources."""
    
    # Sentiment keywords for keyword-based analysis
    POSITIVE_KEYWORDS = {
        "bullish", "surge", "rally", "gain", "profit", "strong", "growth",
        "outperform", "beat", "upgrade", "buy", "positive", "excellent",
        "breakthrough", "record", "soar", "jump", "boom", "success"
    }
    
    NEGATIVE_KEYWORDS = {
        "bearish", "crash", "plunge", "loss", "weak", "decline", "fall",
        "underperform", "miss", "downgrade", "sell", "negative", "poor",
        "collapse", "slump", "drop", "fail", "crisis", "risk"
    }
    
    def __init__(self):
        self.newsapi_url = settings.newsapi_base_url
        self.finnhub_url = settings.finnhub_base_url
        self.timeout = settings.request_timeout
        self._cache: Dict[str, tuple] = {}
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid."""
        if key not in self._cache:
            return False
        data, timestamp = self._cache[key]
        return datetime.now() - timestamp < timedelta(seconds=settings.sentiment_cache_ttl)
    
    def _get_cached(self, key: str) -> Optional[any]:
        """Get cached data if valid."""
        if self._is_cache_valid(key):
            return self._cache[key][0]
        return None
    
    def _set_cache(self, key: str, data: any):
        """Cache data with timestamp."""
        self._cache[key] = (data, datetime.now())
    
    def _calculate_sentiment(self, text: str) -> float:
        """Calculate sentiment score from text using keyword analysis."""
        text_lower = text.lower()
        
        positive_count = sum(1 for keyword in self.POSITIVE_KEYWORDS if keyword in text_lower)
        negative_count = sum(1 for keyword in self.NEGATIVE_KEYWORDS if keyword in text_lower)
        
        total = positive_count + negative_count
        if total == 0:
            return 0.0
        
        # Normalize to -1 to 1 range
        sentiment = (positive_count - negative_count) / total
        return max(-1.0, min(1.0, sentiment))
    
    async def get_sentiment(self, symbol: str) -> Optional[SentimentData]:
        """Get aggregated sentiment for a symbol."""
        cache_key = f"sentiment:{symbol}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        if db_enabled():
            try:
                def _read():
                    with session_scope() as db:
                        snap = db_repo.get_recent_sentiment(db, symbol, settings.sentiment_cache_ttl)
                        if not snap:
                            return None
                        return SentimentData(
                            symbol=snap.symbol,
                            overall_sentiment=snap.overall_sentiment,
                            sentiment_volume=snap.sentiment_volume,
                            recent_articles=[
                                NewsArticle(
                                    title=a.title,
                                    source=a.source,
                                    url=a.url,
                                    published_at=a.published_at,
                                    sentiment=a.sentiment,
                                    keywords=list(a.keywords or []),
                                )
                                for a in (snap.articles or [])
                            ],
                            timestamp=snap.observed_at,
                            provider=snap.provider,
                        )

                from_db = await run_in_threadpool(_read)
                if from_db:
                    self._set_cache(cache_key, from_db)
                    return from_db
            except Exception:
                pass
        
        # Try NewsAPI first
        sentiment = await self._get_sentiment_newsapi(symbol)
        if sentiment:
            self._set_cache(cache_key, sentiment)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_sentiment(symbol, sentiment))
                except Exception:
                    pass
            return sentiment
        
        # Fallback to Finnhub
        sentiment = await self._get_sentiment_finnhub(symbol)
        if sentiment:
            self._set_cache(cache_key, sentiment)
            if db_enabled():
                try:
                    await run_in_threadpool(lambda: _save_sentiment(symbol, sentiment))
                except Exception:
                    pass
            return sentiment
        
        logger.error(f"Failed to get sentiment for {symbol} from all providers")
        return None


def _save_sentiment(symbol: str, sentiment: SentimentData) -> None:
    with session_scope() as db:
        db_repo.save_sentiment(db, symbol, sentiment)
        # Add a short feed event for UX consumers (/api/feed).
        try:
            msg = f"{symbol} sentiment {sentiment.overall_sentiment:+.2f} from {sentiment.provider} ({sentiment.sentiment_volume} articles)"
            db_repo.add_feed_event(db, msg, symbol=symbol, kind="sentiment", icon="SENTI", level="muted", source=sentiment.provider)
        except Exception:
            pass
    
    async def _get_sentiment_newsapi(self, symbol: str) -> Optional[SentimentData]:
        """Get sentiment from NewsAPI."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.newsapi_url}/everything",
                    params={
                        "q": symbol,
                        "sortBy": "publishedAt",
                        "language": "en",
                        "pageSize": 50,
                        "apiKey": settings.news_api_key
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                articles = data.get("articles", [])
                if not articles:
                    return None
                
                news_articles = []
                sentiments = []
                
                for article in articles[:20]:  # Limit to 20 most recent
                    try:
                        title = article.get("title", "")
                        description = article.get("description", "")
                        content = f"{title} {description}"
                        
                        sentiment_score = self._calculate_sentiment(content)
                        sentiments.append(sentiment_score)
                        
                        # Extract keywords (simple approach)
                        keywords = self._extract_keywords(title)
                        
                        news_articles.append(NewsArticle(
                            title=title,
                            source=article.get("source", {}).get("name", "Unknown"),
                            url=article.get("url", ""),
                            published_at=datetime.fromisoformat(
                                article.get("publishedAt", "").replace("Z", "+00:00")
                            ),
                            sentiment=sentiment_score,
                            keywords=keywords
                        ))
                    except Exception as e:
                        logger.warning(f"Error processing article: {e}")
                        continue
                
                if not sentiments:
                    return None
                
                overall_sentiment = sum(sentiments) / len(sentiments)
                
                return SentimentData(
                    symbol=symbol,
                    overall_sentiment=overall_sentiment,
                    sentiment_volume=len(sentiments),
                    recent_articles=news_articles,
                    timestamp=datetime.now(),
                    provider="newsapi"
                )
        except Exception as e:
            logger.warning(f"NewsAPI sentiment fetch failed for {symbol}: {e}")
        return None
    
    async def _get_sentiment_finnhub(self, symbol: str) -> Optional[SentimentData]:
        """Get sentiment from Finnhub."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.finnhub_url}/news",
                    params={
                        "category": "general",
                        "minId": 0,
                        "token": settings.finnhub_api_key
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                articles = data if isinstance(data, list) else []
                if not articles:
                    return None
                
                # Filter articles related to symbol
                relevant_articles = [
                    a for a in articles
                    if symbol.lower() in a.get("headline", "").lower() or
                       symbol.lower() in a.get("summary", "").lower()
                ][:20]
                
                if not relevant_articles:
                    return None
                
                news_articles = []
                sentiments = []
                
                for article in relevant_articles:
                    try:
                        headline = article.get("headline", "")
                        summary = article.get("summary", "")
                        content = f"{headline} {summary}"
                        
                        sentiment_score = self._calculate_sentiment(content)
                        sentiments.append(sentiment_score)
                        
                        keywords = self._extract_keywords(headline)
                        
                        news_articles.append(NewsArticle(
                            title=headline,
                            source=article.get("source", "Unknown"),
                            url=article.get("url", ""),
                            published_at=datetime.fromtimestamp(article.get("datetime", 0)),
                            sentiment=sentiment_score,
                            keywords=keywords
                        ))
                    except Exception as e:
                        logger.warning(f"Error processing Finnhub article: {e}")
                        continue
                
                if not sentiments:
                    return None
                
                overall_sentiment = sum(sentiments) / len(sentiments)
                
                return SentimentData(
                    symbol=symbol,
                    overall_sentiment=overall_sentiment,
                    sentiment_volume=len(sentiments),
                    recent_articles=news_articles,
                    timestamp=datetime.now(),
                    provider="finnhub"
                )
        except Exception as e:
            logger.warning(f"Finnhub sentiment fetch failed for {symbol}: {e}")
        return None
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text."""
        # Simple keyword extraction - split by common delimiters and filter
        words = re.findall(r'\b[a-z]{4,}\b', text.lower())
        # Remove common words
        common_words = {"that", "this", "with", "from", "have", "been", "were", "will"}
        keywords = [w for w in set(words) if w not in common_words]
        return keywords[:5]  # Return top 5
    
    async def get_batch_sentiment(self, symbols: List[str]) -> List[SentimentData]:
        """Get sentiment for multiple symbols concurrently."""
        tasks = [self.get_sentiment(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]
