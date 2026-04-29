# Sentex API - Backend

Production-grade FastAPI backend for real-time market sentiment and hype analysis.

## Architecture

### Multi-Provider Data Aggregation

The backend uses a fallback strategy to ensure data availability:

**Market Data:**
1. Finnhub (primary) - Real-time quotes, OHLCV data
2. Alpha Vantage (fallback) - Historical data, quotes
3. CryptoCompare (fallback) - Cryptocurrency prices

**Sentiment Data:**
1. NewsAPI (primary) - Comprehensive news coverage
2. Finnhub (fallback) - News and sentiment data

### Core Services

#### MarketAggregator
- Fetches current prices and quotes
- Retrieves historical OHLCV data
- Implements provider fallback logic
- Caches data for 30-60 seconds

#### SentimentAggregator
- Aggregates news from multiple sources
- Performs keyword-based sentiment analysis
- Tracks sentiment volume and polarity
- Caches sentiment data for 5 minutes

#### HypeEngine
- Calculates 6-factor weighted hype score (0-100)
- Factors:
  - Sentiment Volume (25%) - Number of articles
  - Sentiment Polarity (25%) - Positive/negative ratio
  - Sentiment Velocity (20%) - Rate of sentiment change
  - Price Momentum (15%) - Recent price movement
  - Price Confirmation (10%) - Sentiment-price alignment
  - Anomaly Detection (5%) - Unusual volatility

#### CorrelationEngine
- Calculates Pearson and Spearman correlations
- Detects lead-lag relationships between assets
- Generates correlation matrices
- Supports multiple time windows (short, medium, long)

## API Endpoints

### Health Check
- `GET /api/health/` - Overall health status
- `GET /api/health/providers` - Provider status details

### Market Data
- `GET /api/market/price/{symbol}` - Current price
- `GET /api/market/quote/{symbol}` - Extended quote data
- `GET /api/market/batch-prices?symbols=AAPL&symbols=GOOGL` - Batch prices
- `GET /api/market/history/{symbol}?days=30` - Historical data

### Sentiment Analysis
- `GET /api/sentiment/{symbol}` - Sentiment score
- `GET /api/sentiment/{symbol}/articles?limit=10` - Recent articles
- `GET /api/sentiment/batch?symbols=AAPL&symbols=GOOGL` - Batch sentiment

### Hype Score
- `GET /api/hype/{symbol}` - Hype score
- `GET /api/hype/{symbol}/factors` - Detailed factors
- `GET /api/hype/batch?symbols=AAPL&symbols=GOOGL` - Batch hype scores

### Correlations
- `GET /api/correlations/pair?symbol1=AAPL&symbol2=GOOGL&period=medium` - Pair correlation
- `GET /api/correlations/matrix?symbols=AAPL&symbols=GOOGL&symbols=MSFT&period=medium` - Correlation matrix
- `GET /api/correlations/batch?symbols=AAPL&symbols=GOOGL&period=medium` - All pairwise correlations

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Create `.env` file with API keys:
```
NEWS_API_KEY=your_newsapi_key
FINNHUB_API_KEY=your_finnhub_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
CRYPTO_COMPARE_API_KEY=your_crypto_compare_key
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

### 3. Run Server
```bash
python -m uvicorn backend.main:app --reload
```

Server will be available at `http://localhost:8000`

## API Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Caching Strategy

- **Market Data**: 30-60 second TTL
- **Sentiment Data**: 5 minute TTL
- **Hype Scores**: 1 minute TTL
- **Correlations**: 5 minute TTL

## Error Handling

All endpoints return standardized error responses:
```json
{
  "error": "Error type",
  "detail": "Detailed error message",
  "timestamp": "2024-01-01T12:00:00"
}
```

## Performance Considerations

- Async/await for concurrent API calls
- Connection pooling with httpx
- Intelligent caching to reduce API calls
- Provider fallback to ensure availability
- Request timeouts (10 seconds default)

## Testing

Run tests with:
```bash
pytest tests/
```

## Deployment

For production deployment:
1. Set `DEBUG=false` in `.env`
2. Use production ASGI server (Gunicorn + Uvicorn)
3. Configure proper logging
4. Set up monitoring and alerting
5. Use environment-specific API keys

Example production command:
```bash
gunicorn backend.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```
