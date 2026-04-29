from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
from backend.schemas import SentimentResponse
from backend.services.sentiment_aggregator import SentimentAggregator
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sentiment", tags=["sentiment"])
sentiment_agg = SentimentAggregator()


@router.get("/{symbol}", response_model=SentimentResponse)
async def get_sentiment(symbol: str):
    """Get sentiment analysis for a symbol."""
    try:
        sentiment = await sentiment_agg.get_sentiment(symbol.upper())
        if not sentiment:
            raise HTTPException(status_code=404, detail=f"Sentiment not found for {symbol}")
        
        return SentimentResponse(
            symbol=symbol.upper(),
            sentiment=sentiment.overall_sentiment,
            volume=sentiment.sentiment_volume,
            articles_count=len(sentiment.recent_articles),
            timestamp=datetime.now(),
            cached=False
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sentiment for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sentiment")


@router.get("/{symbol}/articles")
async def get_sentiment_articles(symbol: str, limit: int = Query(10, ge=1, le=50)):
    """Get recent articles for sentiment analysis."""
    try:
        sentiment = await sentiment_agg.get_sentiment(symbol.upper())
        if not sentiment:
            raise HTTPException(status_code=404, detail=f"Articles not found for {symbol}")
        
        articles = sentiment.recent_articles[:limit]
        
        return {
            "symbol": symbol.upper(),
            "articles": [
                {
                    "title": a.title,
                    "source": a.source,
                    "url": a.url,
                    "published_at": a.published_at.isoformat(),
                    "sentiment": a.sentiment,
                    "keywords": a.keywords
                }
                for a in articles
            ],
            "count": len(articles),
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching articles for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch articles")


@router.get("/batch")
async def get_batch_sentiment(symbols: List[str] = Query(...)):
    """Get sentiment for multiple symbols."""
    try:
        if not symbols:
            raise HTTPException(status_code=400, detail="At least one symbol required")
        
        symbols = [s.upper() for s in symbols]
        sentiments = await sentiment_agg.get_batch_sentiment(symbols)
        
        if not sentiments:
            raise HTTPException(status_code=404, detail="No sentiment data found")
        
        return {
            "sentiments": [
                {
                    "symbol": s.symbol,
                    "sentiment": s.overall_sentiment,
                    "volume": s.sentiment_volume,
                    "articles_count": len(s.recent_articles)
                }
                for s in sentiments
            ],
            "count": len(sentiments),
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching batch sentiment: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch batch sentiment")
