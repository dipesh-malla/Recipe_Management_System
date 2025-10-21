"""Response schemas for ML Backend API."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RecipeRecommendation(BaseModel):
    """Single recipe recommendation with metadata."""
    recipe_id: int = Field(..., description="Recipe ID")
    title: str = Field(..., description="Recipe title")
    score: float = Field(..., description="Recommendation score (0-1)", ge=0.0, le=1.0)
    reason: Optional[str] = Field(None, description="Explanation for recommendation")
    cuisine: Optional[str] = Field(None, description="Cuisine type")
    dietary_type: Optional[str] = Field(None, description="Dietary type")
    cook_time: Optional[int] = Field(None, description="Cooking time in minutes")
    difficulty: Optional[str] = Field(None, description="Difficulty level")
    calories_per_serving: Optional[float] = Field(None, description="Calories per serving")
    avg_rating: Optional[float] = Field(None, description="Average rating")
    
    model_config = {"json_schema_extra": {
        "example": {
            "recipe_id": 456,
            "title": "Chickpea Curry",
            "score": 0.94,
            "reason": "user_pref:vegan + high_similarity",
            "cuisine": "indian",
            "dietary_type": "vegan",
            "cook_time": 30,
            "difficulty": "easy",
            "calories_per_serving": 320.5,
            "avg_rating": 4.5
        }
    }}


class RecipeRecommendationResponse(BaseModel):
    """Response for recipe recommendations."""
    user_id: int = Field(..., description="User ID")
    recommendations: List[RecipeRecommendation] = Field(..., description="List of recommendations")
    model_used: str = Field(..., description="Model used for recommendations (two_tower, als, popularity)")
    cached: bool = Field(..., description="Whether results were served from cache")
    latency_ms: float = Field(..., description="Request latency in milliseconds", ge=0)
    total_candidates: Optional[int] = Field(None, description="Total candidates before filtering")
    
    model_config = {"json_schema_extra": {
        "example": {
            "user_id": 123,
            "recommendations": [
                {
                    "recipe_id": 456,
                    "title": "Chickpea Curry",
                    "score": 0.94,
                    "reason": "user_pref:vegan + high_similarity",
                    "cuisine": "indian",
                    "cook_time": 30,
                    "difficulty": "easy"
                }
            ],
            "model_used": "two_tower",
            "cached": False,
            "latency_ms": 47.2
        }
    }}


class UserSimilarity(BaseModel):
    """Similar user information."""
    user_id: int = Field(..., description="Similar user ID")
    similarity_score: float = Field(..., description="Similarity score (0-1)", ge=0.0, le=1.0)
    common_preferences: Optional[List[str]] = Field(None, description="Common preferences")


class UserSimilarityResponse(BaseModel):
    """Response for user similarity."""
    user_id: int = Field(..., description="Query user ID")
    similar_users: List[UserSimilarity] = Field(..., description="List of similar users")
    model_used: str = Field(..., description="Model used")
    latency_ms: float = Field(..., description="Request latency in milliseconds")


class UserRecommendations(BaseModel):
    """Recommendations for a single user in batch response."""
    user_id: int = Field(..., description="User ID")
    recommendations: List[RecipeRecommendation] = Field(..., description="Recommendations")
    error: Optional[str] = Field(None, description="Error message if recommendation failed")


class BatchRecommendationResponse(BaseModel):
    """Response for batch recommendations."""
    results: List[UserRecommendations] = Field(..., description="Recommendations per user")
    model_used: str = Field(..., description="Model used")
    total_users: int = Field(..., description="Total number of users processed")
    successful_count: int = Field(..., description="Number of successful recommendations")
    failed_count: int = Field(..., description="Number of failed recommendations")
    latency_ms: float = Field(..., description="Total batch processing time")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Overall status (healthy, degraded, unhealthy)")
    models_loaded: bool = Field(..., description="Whether ML models are loaded")
    cache_connected: bool = Field(..., description="Whether Redis cache is connected")
    kafka_connected: bool = Field(..., description="Whether Kafka is connected")
    uptime_seconds: float = Field(..., description="Application uptime in seconds")
    version: str = Field(..., description="API version")
    models: Dict[str, bool] = Field(..., description="Status of individual models")
    
    model_config = {"json_schema_extra": {
        "example": {
            "status": "healthy",
            "models_loaded": True,
            "cache_connected": True,
            "kafka_connected": True,
            "uptime_seconds": 3600.5,
            "version": "1.0.0",
            "models": {
                "two_tower": True,
                "als": True
            }
        }
    }}


class SyncResponse(BaseModel):
    """Response for sync operations."""
    success: bool = Field(..., description="Whether sync was successful")
    items_processed: int = Field(..., description="Number of items processed")
    items_failed: int = Field(0, description="Number of items that failed")
    message: str = Field(..., description="Status message")
    errors: Optional[List[str]] = Field(None, description="Error messages if any")


class ErrorResponse(BaseModel):
    """Error response."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    detail: Optional[Any] = Field(None, description="Additional error details")
    
    model_config = {"json_schema_extra": {
        "example": {
            "error": "UserNotFound",
            "message": "User with ID 123 not found in mappings",
            "detail": {"user_id": 123}
        }
    }}
