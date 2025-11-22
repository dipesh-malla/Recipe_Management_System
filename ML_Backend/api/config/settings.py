"""
Application settings and configuration.
All external service connections are configured via environment variables.
"""
import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    APP_NAME: str = "Recipe ML Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Model paths (relative to project root)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    MODEL_PATH: Path = BASE_DIR / "RecipeML" / "models"
    PROCESSED_PATH: Path = BASE_DIR / "RecipeML" / "processed"
    DATA_PATH: Path = BASE_DIR / "RecipeML" / "data"
    
    # ALS Model
    ALS_MODEL_PATTERN: str = "als_model_*.pkl"
    
    # Two-Tower Model
    TWO_TOWER_MODEL_DIR: str = "two_tower"
    TWO_TOWER_MODEL_FILE: str = "two_tower_model.pth"
    TWO_TOWER_CONFIG_FILE: str = "model_config.pkl"
    TWO_TOWER_SCALERS_FILE: str = "scalers.pkl"
    
    # Mappings and metadata
    MAPPINGS_FILE: str = "mappings.pkl"
    METADATA_FILE: str = "metadata.pkl"
    
    # Java Backend Integration
    JAVA_BACKEND_URL: str = "http://localhost:8080"
    JAVA_BACKEND_TIMEOUT: int = 5
    JAVA_BACKEND_MAX_RETRIES: int = 3
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 10
    REDIS_DECODE_RESPONSES: bool = True
    CACHE_TTL: int = 3600  # 1 hour
    CACHE_ENABLED: bool = True
    
    # Kafka Configuration
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_INTERACTIONS_TOPIC: str = "interactions"
    KAFKA_CONSUMER_GROUP: str = "ml-backend-consumer"
    KAFKA_AUTO_OFFSET_RESET: str = "latest"
    KAFKA_ENABLED: bool = True
    
    # ML Model Configuration
    DEFAULT_TOP_K: int = 10
    MAX_BATCH_SIZE: int = 50
    EMBEDDING_DIM: int = 128
    DEVICE: str = "cpu"  # or "cuda" if GPU available

    # PostgreSQL Configuration
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    
    # Recommendation Settings
    MMR_DIVERSITY_WEIGHT: float = 0.3  # lambda for MMR (1-alpha in diversity formula)
    POPULARITY_FALLBACK_COUNT: int = 20
    MIN_SCORE_THRESHOLD: float = 0.0
    
    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    LOG_LEVEL: str = "INFO"
    
    # Performance
    WORKERS: int = 4
    PRECOMPUTE_EMBEDDINGS: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    def get_als_model_path(self) -> Path:
        """Get the path to the latest ALS model file."""
        import glob
        pattern = str(self.MODEL_PATH / self.ALS_MODEL_PATTERN)
        als_files = glob.glob(pattern)
        if not als_files:
            raise FileNotFoundError(f"No ALS model found matching pattern: {pattern}")
        # Return the most recent file
        return Path(max(als_files, key=os.path.getctime))
    
    def get_two_tower_model_path(self) -> Path:
        """Get the path to the Two-Tower model file."""
        path = self.MODEL_PATH / self.TWO_TOWER_MODEL_DIR / self.TWO_TOWER_MODEL_FILE
        if not path.exists():
            raise FileNotFoundError(f"Two-Tower model not found at: {path}")
        return path
    
    def get_two_tower_config_path(self) -> Path:
        """Get the path to the Two-Tower config file."""
        path = self.MODEL_PATH / self.TWO_TOWER_MODEL_DIR / self.TWO_TOWER_CONFIG_FILE
        if not path.exists():
            raise FileNotFoundError(f"Two-Tower config not found at: {path}")
        return path
    
    def get_two_tower_scalers_path(self) -> Path:
        """Get the path to the Two-Tower scalers file."""
        path = self.MODEL_PATH / self.TWO_TOWER_MODEL_DIR / self.TWO_TOWER_SCALERS_FILE
        if not path.exists():
            raise FileNotFoundError(f"Two-Tower scalers not found at: {path}")
        return path
    
    def get_mappings_path(self) -> Path:
        """Get the path to the mappings file."""
        path = self.PROCESSED_PATH / self.MAPPINGS_FILE
        if not path.exists():
            raise FileNotFoundError(f"Mappings file not found at: {path}")
        return path
    
    def get_metadata_path(self) -> Path:
        """Get the path to the metadata file."""
        path = self.PROCESSED_PATH / self.METADATA_FILE
        if not path.exists():
            raise FileNotFoundError(f"Metadata file not found at: {path}")
        return path
    
    def get_recipes_data_path(self) -> Path:
        """Get the path to recipes CSV file."""
        path = self.DATA_PATH / "recipes.csv"
        if not path.exists():
            raise FileNotFoundError(f"Recipes data not found at: {path}")
        return path
    
    def get_kafka_servers(self) -> List[str]:
        """Parse Kafka bootstrap servers (comma-separated string) into a list."""
        if isinstance(self.KAFKA_BOOTSTRAP_SERVERS, list):
            return self.KAFKA_BOOTSTRAP_SERVERS
        return [s.strip() for s in self.KAFKA_BOOTSTRAP_SERVERS.split(",")]


# Singleton instance
settings = Settings()
