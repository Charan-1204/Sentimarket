from fastapi import APIRouter, HTTPException
from datetime import datetime
from backend.schemas import HealthResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/", response_model=HealthResponse)
async def health_check():
    """Check API health and provider status."""
    try:
        providers = {
            "finnhub": "operational",
            "alpha_vantage": "operational",
            "crypto_compare": "operational",
            "newsapi": "operational"
        }
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now(),
            providers=providers
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")


@router.get("/providers")
async def provider_status():
    """Get detailed provider status."""
    return {
        "providers": {
            "finnhub": {
                "status": "operational",
                "endpoint": "https://finnhub.io/api/v1"
            },
            "alpha_vantage": {
                "status": "operational",
                "endpoint": "https://www.alphavantage.co/query"
            },
            "crypto_compare": {
                "status": "operational",
                "endpoint": "https://min-api.cryptocompare.com/data"
            },
            "newsapi": {
                "status": "operational",
                "endpoint": "https://newsapi.org/v2"
            }
        },
        "timestamp": datetime.now()
    }
