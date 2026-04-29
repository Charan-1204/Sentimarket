from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Market Data Schemas
class PriceData(BaseModel):
    """Current price data for an asset."""
    symbol: str
    price: float
    currency: str = "USD"
    timestamp: datetime
    provider: str
    change: Optional[float] = None
    change_percent: Optional[float] = None


class QuoteData(BaseModel):
    """Extended quote data including OHLCV."""
    symbol: str
    price: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[int] = None
    timestamp: datetime
    provider: str
    change: Optional[float] = None
    change_percent: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None


class HistoricalData(BaseModel):
    """Historical OHLCV data point."""
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class MarketDataResponse(BaseModel):
    """Response for market data endpoints."""
    symbol: str
    data: Dict[str, Any]
    provider: str
    timestamp: datetime
    cached: bool = False


class BatchPriceResponse(BaseModel):
    """Response for batch price requests."""
    prices: List[PriceData]
    timestamp: datetime
    cached: bool = False


# Sentiment Schemas
class NewsArticle(BaseModel):
    """News article with sentiment."""
    title: str
    source: str
    url: str
    published_at: datetime
    sentiment: float  # -1 to 1
    keywords: List[str] = []


class SentimentData(BaseModel):
    """Aggregated sentiment data."""
    symbol: str
    overall_sentiment: float  # -1 to 1
    sentiment_volume: int  # number of articles
    recent_articles: List[NewsArticle]
    timestamp: datetime
    provider: str


class SentimentResponse(BaseModel):
    """Response for sentiment endpoints."""
    symbol: str
    sentiment: float
    volume: int
    articles_count: int
    timestamp: datetime
    cached: bool = False


# Hype Score Schemas
class HypeFactors(BaseModel):
    """Individual hype score factors."""
    sentiment_volume: float  # 25% weight
    sentiment_polarity: float  # 25% weight
    sentiment_velocity: float  # 20% weight
    price_momentum: float  # 15% weight
    price_confirmation: float  # 10% weight
    anomaly_detection: float  # 5% weight


class HypeScoreData(BaseModel):
    """Hype score with component breakdown."""
    symbol: str
    hype_score: float  # 0-100
    factors: HypeFactors
    trend: str  # "rising", "stable", "falling"
    timestamp: datetime


class HypeScoreResponse(BaseModel):
    """Response for hype score endpoints."""
    symbol: str
    hype_score: float
    trend: str
    timestamp: datetime
    cached: bool = False


# Correlation Schemas
class CorrelationPair(BaseModel):
    """Correlation between two assets."""
    symbol1: str
    symbol2: str
    correlation: float  # -1 to 1
    period: str  # "short", "medium", "long"
    lead_lag: Optional[str] = None  # "symbol1_leads", "symbol2_leads", "none"


class CorrelationMatrix(BaseModel):
    """Full correlation matrix for multiple assets."""
    symbols: List[str]
    matrix: List[List[float]]
    period: str
    timestamp: datetime


class CorrelationResponse(BaseModel):
    """Response for correlation endpoints."""
    correlations: List[CorrelationPair]
    timestamp: datetime
    cached: bool = False


class CorrelationMatrixResponse(BaseModel):
    """Response for correlation matrix endpoint."""
    matrix: CorrelationMatrix
    timestamp: datetime
    cached: bool = False


# Health Check Schemas
class HealthStatus(BaseModel):
    """Health check status."""
    status: str  # "healthy", "degraded", "unhealthy"
    timestamp: datetime
    providers: Dict[str, str]  # provider -> status


class HealthResponse(BaseModel):
    """Response for health check endpoint."""
    status: str
    timestamp: datetime
    providers: Dict[str, str]


# Error Schemas
class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: str
    timestamp: datetime
    request_id: Optional[str] = None
