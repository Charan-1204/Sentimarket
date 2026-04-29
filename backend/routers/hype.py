from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
from backend.schemas import HypeScoreResponse
from backend.services.hype_engine import HypeEngine
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hype", tags=["hype"])
hype_engine = HypeEngine()


@router.get("/{symbol}", response_model=HypeScoreResponse)
async def get_hype_score(symbol: str):
    """Get hype score for a symbol."""
    try:
        hype_data = await hype_engine.calculate_hype_score(symbol.upper())
        if not hype_data:
            raise HTTPException(status_code=404, detail=f"Hype score not found for {symbol}")
        
        return HypeScoreResponse(
            symbol=symbol.upper(),
            hype_score=hype_data.hype_score,
            trend=hype_data.trend,
            timestamp=datetime.now(),
            cached=False
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating hype score for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate hype score")


@router.get("/{symbol}/factors")
async def get_hype_factors(symbol: str):
    """Get detailed hype score factors."""
    try:
        hype_data = await hype_engine.calculate_hype_score(symbol.upper())
        if not hype_data:
            raise HTTPException(status_code=404, detail=f"Hype factors not found for {symbol}")
        
        return {
            "symbol": symbol.upper(),
            "hype_score": hype_data.hype_score,
            "trend": hype_data.trend,
            "factors": {
                "sentiment_volume": hype_data.factors.sentiment_volume,
                "sentiment_polarity": hype_data.factors.sentiment_polarity,
                "sentiment_velocity": hype_data.factors.sentiment_velocity,
                "price_momentum": hype_data.factors.price_momentum,
                "price_confirmation": hype_data.factors.price_confirmation,
                "anomaly_detection": hype_data.factors.anomaly_detection
            },
            "weights": {
                "sentiment_volume": 0.25,
                "sentiment_polarity": 0.25,
                "sentiment_velocity": 0.20,
                "price_momentum": 0.15,
                "price_confirmation": 0.10,
                "anomaly_detection": 0.05
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching hype factors for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch hype factors")


@router.get("/batch")
async def get_batch_hype_scores(symbols: List[str] = Query(...)):
    """Get hype scores for multiple symbols."""
    try:
        if not symbols:
            raise HTTPException(status_code=400, detail="At least one symbol required")
        
        symbols = [s.upper() for s in symbols]
        hype_scores = []
        
        for symbol in symbols:
            hype_data = await hype_engine.calculate_hype_score(symbol)
            if hype_data:
                hype_scores.append({
                    "symbol": symbol,
                    "hype_score": hype_data.hype_score,
                    "trend": hype_data.trend
                })
        
        if not hype_scores:
            raise HTTPException(status_code=404, detail="No hype scores found")
        
        return {
            "hype_scores": hype_scores,
            "count": len(hype_scores),
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching batch hype scores: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch batch hype scores")
