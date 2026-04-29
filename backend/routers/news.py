from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from backend.schemas import NewsArticle
from backend.services.sentiment_aggregator import SentimentAggregator
import logging
from fastapi import Depends
from sqlalchemy.orm import Session

from backend.db.deps import get_db
from backend.db import repo as db_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/news", tags=["news"])
sentiment_agg = SentimentAggregator()


@router.get("", response_model=dict)
async def get_news(
    symbol: Optional[str] = Query(None),
    limit: int = Query(8, ge=1, le=50),
    db: Session = Depends(get_db),
):

    try:
        if symbol:
            sentiment = await sentiment_agg.get_sentiment(symbol.upper())
            if not sentiment or not sentiment.recent_articles:
                raise HTTPException(status_code=404, detail=f"No articles found for {symbol}")
            articles = sentiment.recent_articles[:limit]
        else:
            # General crypto news - query sentiment aggregator with 'CRYPTO'
            sentiment = await sentiment_agg.get_sentiment('CRYPTO')
            if not sentiment or not sentiment.recent_articles:
                # Fallback mock data if no real news
                articles = generate_mock_articles(limit)
            else:
                articles = sentiment.recent_articles[:limit]

        payload = {
            "articles": [
                {
                    "title": a.title,
                    "source": a.source,
                    "url": a.url,
                    "publishedAt": a.published_at.isoformat(),
                    "sentiment": a.sentiment,
                    "summary": a.title[:100] + "..." if len(a.title) > 100 else a.title
                }
                for a in articles
            ],
            "count": len(articles),
            "timestamp": datetime.now().isoformat()
        }

        # Persist a lightweight feed event so /api/feed can drive the UI.
        try:
            headline = articles[0].title if articles else "news update"
            msg = f"{(symbol or 'CRYPTO').upper()} news: {headline}"
            db_repo.add_feed_event(db, msg, symbol=(symbol.upper() if symbol else None), kind="news", icon="NEWS", level="green", source="news")
        except Exception:
            pass

        return payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        articles = generate_mock_articles(limit)
        return {
            "articles": articles,
            "count": len(articles),
            "timestamp": datetime.now().isoformat(),
            "note": "Mock data - check API keys in .env"
        }


def generate_mock_articles(limit: int) -> List[NewsArticle]:
    from datetime import timedelta
    mock_data = [
        {"title": "Bitcoin Surges Past $67K on ETF Inflows", "source": "CoinDesk", "sentiment": 0.7},
        {"title": "Ethereum ETF Approval Boosts ETH Price", "source": "CoinTelegraph", "sentiment": 0.6},
        {"title": "Solana Network Congestion Issues Persist", "source": "The Block", "sentiment": -0.3},
        {"title": "Dogecoin Gains on Elon Musk Tweet", "source": "CryptoSlate", "sentiment": 0.8},
        {"title": "PEPE Meme Coin Sees 20% Weekly Pump", "source": "Decrypt", "sentiment": 0.5},
        {"title": "Avalanche Subnet Adoption Accelerates", "source": "Messari", "sentiment": 0.4},
        {"title": "Market Awaits Fed Rate Decision", "source": "Bloomberg Crypto", "sentiment": 0.1},
        {"title": "Binance Launches New Margin Trading Pairs", "source": "CryptoNews", "sentiment": 0.2},
        {"title": "Cardano Smart Contract Milestone", "source": "Cardano Feed", "sentiment": 0.3},
        {"title": "Polkadot parachain auctions heat up", "source": "DOT News", "sentiment": 0.4},
    ]
    now = datetime.now()
    return [
        NewsArticle(
            title=item["title"],
            source=item["source"],
            url=f"https://example.com/news/{i}",
            published_at=now - timedelta(hours=i+1),
            sentiment=item["sentiment"],
            keywords=[title.split()[0].lower() for title in [item["title"]]]
        )
        for i, item in enumerate(mock_data[:limit])
    ]

