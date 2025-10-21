"""Pydantic schemas for requests and responses."""
from .request import (
    RecipeRecommendationRequest,
    UserSimilarityRequest,
    BatchRecommendationRequest,
    ColdStartRequest,
    UserPreferences,
    RecipeFilters
)
from .response import (
    RecipeRecommendation,
    RecipeRecommendationResponse,
    UserSimilarityResponse,
    BatchRecommendationResponse,
    HealthResponse,
    ErrorResponse
)

__all__ = [
    "RecipeRecommendationRequest",
    "UserSimilarityRequest",
    "BatchRecommendationRequest",
    "ColdStartRequest",
    "UserPreferences",
    "RecipeFilters",
    "RecipeRecommendation",
    "RecipeRecommendationResponse",
    "UserSimilarityResponse",
    "BatchRecommendationResponse",
    "HealthResponse",
    "ErrorResponse",
]
