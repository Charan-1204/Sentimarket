from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import logging
from backend.config import settings
from backend.routers import health, market, sentiment, hype, correlations, news
from backend.routers import feed, watchlists

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    logger.info("Starting Sentex API server")
    yield
    logger.info("Shutting down Sentex API server")


# Create FastAPI app
app = FastAPI(
    title="Sentex API",
    description="Real-time market sentiment and hype analysis API",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")
    return response


# Include routers
app.include_router(health.router)
app.include_router(market.router)
app.include_router(sentiment.router)
app.include_router(hype.router)
app.include_router(correlations.router)
app.include_router(news.router)
app.include_router(feed.router)
app.include_router(watchlists.router)


# Root endpoint
@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "Sentex API",
        "version": "1.0.0",
        "description": "Real-time market sentiment and hype analysis",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/api/health",
            "market": "/api/market",
            "sentiment": "/api/sentiment",
            "hype": "/api/hype",
            "correlations": "/api/correlations",
            "news": "/api/news",
            "feed": "/api/feed",
            "watchlists": "/api/watchlists/{user_id}"
        }
    }


# Error handlers
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return {
        "error": "Internal Server Error",
        "detail": str(exc),
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="info"
    )
