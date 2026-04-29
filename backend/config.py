from pydantic_settings import BaseSettings
from typing import Optional, Union
from urllib.parse import quote_plus


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    # API Keys
    news_api_key: str
    finnhub_api_key: str
    alpha_vantage_api_key: str
    crypto_compare_api_key: str
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    # Some environments set DEBUG="release" or similar. Accept strings and normalize.
    debug: Union[bool, str] = False

    # Database Configuration (MySQL / AWS RDS)
    # Prefer setting DATABASE_URL directly. If omitted, DB_* parts are used to build it.
    database_url: Optional[str] = None
    db_host: Optional[str] = None
    db_port: int = 3306
    db_name: Optional[str] = None
    db_user: Optional[str] = None
    db_password: Optional[str] = None
    
    # API Endpoints
    finnhub_base_url: str = "https://finnhub.io/api/v1"
    alpha_vantage_base_url: str = "https://www.alphavantage.co/query"
    crypto_compare_base_url: str = "https://min-api.cryptocompare.com/data"
    newsapi_base_url: str = "https://newsapi.org/v2"
    
    # Cache Configuration
    market_cache_ttl: int = 30  # seconds
    sentiment_cache_ttl: int = 300  # seconds
    
    # Request Configuration
    request_timeout: int = 10  # seconds
    max_retries: int = 2
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

    @property
    def resolved_database_url(self) -> Optional[str]:
        """Return a SQLAlchemy DB URL if configured, else None."""
        if self.database_url:
            return self.database_url
        if not (self.db_host and self.db_name and self.db_user and self.db_password):
            return None
        # Encode password safely for URL usage.
        password = quote_plus(self.db_password)
        return f"mysql+pymysql://{self.db_user}:{password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def debug_enabled(self) -> bool:
        if isinstance(self.debug, bool):
            return self.debug
        value = str(self.debug).strip().lower()
        return value in {"1", "true", "yes", "y", "on", "debug", "dev", "development"}


settings = Settings()
