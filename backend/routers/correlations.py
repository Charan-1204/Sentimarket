from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
from backend.schemas import CorrelationResponse, CorrelationMatrixResponse
from backend.services.correlation_engine import CorrelationEngine
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/correlations", tags=["correlations"])
correlation_engine = CorrelationEngine()


@router.get("/pair", response_model=CorrelationResponse)
async def get_correlation(
    symbol1: str = Query(...),
    symbol2: str = Query(...),
    period: str = Query("medium", regex="^(short|medium|long)$")
):
    """Get correlation between two symbols."""
    try:
        correlation = await correlation_engine.get_correlation(
            symbol1.upper(),
            symbol2.upper(),
            period
        )
        if not correlation:
            raise HTTPException(status_code=404, detail="Correlation not found")
        
        return CorrelationResponse(
            correlations=[correlation],
            timestamp=datetime.now(),
            cached=False
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating correlation: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate correlation")


@router.get("/matrix", response_model=CorrelationMatrixResponse)
async def get_correlation_matrix(
    symbols: List[str] = Query(...),
    period: str = Query("medium", regex="^(short|medium|long)$")
):
    """Get correlation matrix for multiple symbols."""
    try:
        if not symbols or len(symbols) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols required")
        
        symbols = [s.upper() for s in symbols]
        matrix = await correlation_engine.get_correlation_matrix(symbols, period)
        
        if not matrix:
            raise HTTPException(status_code=404, detail="Correlation matrix not found")
        
        return CorrelationMatrixResponse(
            matrix=matrix,
            timestamp=datetime.now(),
            cached=False
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating correlation matrix: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate correlation matrix")


@router.get("/batch")
async def get_batch_correlations(
    symbols: List[str] = Query(...),
    period: str = Query("medium", regex="^(short|medium|long)$")
):
    """Get all pairwise correlations for symbols."""
    try:
        if not symbols or len(symbols) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols required")
        
        symbols = [s.upper() for s in symbols]
        correlations = []
        
        for i in range(len(symbols)):
            for j in range(i + 1, len(symbols)):
                corr = await correlation_engine.get_correlation(
                    symbols[i],
                    symbols[j],
                    period
                )
                if corr:
                    correlations.append({
                        "symbol1": corr.symbol1,
                        "symbol2": corr.symbol2,
                        "correlation": corr.correlation,
                        "lead_lag": corr.lead_lag
                    })
        
        if not correlations:
            raise HTTPException(status_code=404, detail="No correlations found")
        
        return {
            "correlations": correlations,
            "count": len(correlations),
            "period": period,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching batch correlations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch batch correlations")
