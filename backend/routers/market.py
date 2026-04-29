from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
from backend.schemas import PriceData, QuoteData, MarketDataResponse, BatchPriceResponse
from backend.services.market_aggregator import MarketAggregator
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/market", tags=["market"])
market_agg = MarketAggregator()


@router.get("/price/{symbol}", response_model=PriceData)
async def get_price(symbol: str):
    """Get current price for a symbol."""
    try:
        price = await market_agg.get_price(symbol.upper())
        if not price:
            raise HTTPException(status_code=404, detail=f"Price not found for {symbol}")
        return price
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch price")


@router.get("/quote/{symbol}", response_model=QuoteData)
async def get_quote(symbol: str):
    """Get extended quote data for a symbol."""
    try:
        quote = await market_agg.get_quote(symbol.upper())
        if not quote:
            raise HTTPException(status_code=404, detail=f"Quote not found for {symbol}")
        return quote
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch quote")


@router.get("/batch-prices", response_model=BatchPriceResponse)
async def get_batch_prices(symbols: List[str] = Query(...)):
    """Get prices for multiple symbols."""
    try:
        if not symbols:
            raise HTTPException(status_code=400, detail="At least one symbol required")
        
        symbols = [s.upper() for s in symbols]
        prices = await market_agg.get_batch_prices(symbols)
        
        if not prices:
            raise HTTPException(status_code=404, detail="No prices found")
        
        return BatchPriceResponse(
            prices=prices,
            timestamp=datetime.now(),
            cached=False
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching batch prices: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch batch prices")


@router.get("/history/{symbol}")
async def get_history(symbol: str, days: int = Query(30, ge=1, le=365)):
    """Get historical data for a symbol."""
    try:
        history = await market_agg.get_historical(symbol.upper(), days=days)
        if not history:
            raise HTTPException(status_code=404, detail=f"Historical data not found for {symbol}")
        
        return {
            "symbol": symbol.upper(),
            "data": [
                {
                    "timestamp": h.timestamp.isoformat(),
                    "open": h.open,
                    "high": h.high,
                    "low": h.low,
                    "close": h.close,
                    "volume": h.volume
                }
                for h in history
            ],
            "timestamp": datetime.now().isoformat(),
            "count": len(history)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch historical data")
