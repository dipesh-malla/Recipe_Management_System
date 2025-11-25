"""Request schemas for ML Backend API."""
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class RecipeFilters(BaseModel):
    """Filters for recipe recommendations."""
    dietary_type: Optional[str] = Field(None, description="Filter by dietary type (e.g., vegan, vegetarian)")
    cuisine: Optional[str] = Field(None, description="Filter by cuisine type")
    max_cook_time: Optional[int] = Field(None, description="Maximum cooking time in minutes", ge=0)
    min_cook_time: Optional[int] = Field(None, description="Minimum cooking time in minutes", ge=0)
    difficulty: Optional[str] = Field(None, description="Filter by difficulty (easy, medium, hard)")
    max_calories: Optional[int] = Field(None, description="Maximum calories per serving", ge=0)
    cooking_method: Optional[str] = Field(None, description="Filter by cooking method")
    
    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v: Optional[str]) -> Optional[str]:
        """Validate difficulty level."""
        if v is not None:
            allowed = ['easy', 'medium', 'hard']
            v_lower = v.lower()
            if v_lower not in allowed:
                raise ValueError(f"difficulty must be one of {allowed}")
            return v_lower
        return v


class RecipeRecommendationRequest(BaseModel):
    """Request model for recipe recommendations."""
    user_id: int = Field(..., description="User ID for personalized recommendations", ge=1)
    top_k: int = Field(10, description="Number of recommendations to return", ge=1, le=100)
    exclude_recipe_ids: List[int] = Field(default_factory=list, description="Recipe IDs to exclude from recommendations")
    filters: Optional[RecipeFilters] = Field(None, description="Optional filters for recommendations")
    apply_diversity: bool = Field(True, description="Apply MMR diversity to recommendations")
    diversity_weight: Optional[float] = Field(None, description="Diversity weight (0-1, higher=more diverse)", ge=0.0, le=1.0)
    
    model_config = {"json_schema_extra": {
        "example": {
            "user_id": 123,
            "top_k": 5,
            "exclude_recipe_ids": [456, 789],
            "filters": {
                "dietary_type": "vegan",
                "max_cook_time": 45,
                "difficulty": "easy"
            },
            "apply_diversity": True
        }
    }}


class UserPreferences(BaseModel):
    """User preferences for cold-start recommendations."""
    dietary_preferences: Optional[List[str]] = Field(default_factory=list, description="Dietary preferences")
    cuisine_preferences: Optional[List[str]] = Field(default_factory=list, description="Preferred cuisines")
    max_cook_time: Optional[int] = Field(None, description="Maximum acceptable cooking time", ge=0)
    difficulty_preference: Optional[str] = Field(None, description="Preferred difficulty level")
    favorite_ingredients: Optional[List[str]] = Field(default_factory=list, description="Favorite ingredients")
    

class ColdStartRequest(BaseModel):
    """Request for cold-start recommendations (new users without history)."""
    preferences: UserPreferences = Field(..., description="User preferences")
    top_k: int = Field(10, description="Number of recommendations", ge=1, le=100)
    exclude_recipe_ids: List[int] = Field(default_factory=list, description="Recipe IDs to exclude")
    
    model_config = {"json_schema_extra": {
        "example": {
            "preferences": {
                "dietary_preferences": ["vegan", "gluten-free"],
                "cuisine_preferences": ["italian", "indian"],
                "max_cook_time": 30,
                "difficulty_preference": "easy"
            },
            "top_k": 10
        }
    }}


class UserSimilarityRequest(BaseModel):
    """Request for finding similar users."""
    user_id: int = Field(..., description="User ID to find similar users for", ge=1)
    top_k: int = Field(10, description="Number of similar users to return", ge=1, le=50)
    
    model_config = {"json_schema_extra": {
        "example": {
            "user_id": 123,
            "top_k": 10
        }
    }}


class BatchRecommendationRequest(BaseModel):
    """Request for batch recommendations for multiple users."""
    user_ids: List[int] = Field(..., description="List of user IDs", min_length=1, max_length=100)
    top_k: int = Field(10, description="Number of recommendations per user", ge=1, le=50)
    apply_diversity: bool = Field(True, description="Apply diversity to recommendations")
    
    @field_validator('user_ids')
    @classmethod
    def validate_user_ids(cls, v: List[int]) -> List[int]:
        """Ensure unique user IDs."""
        if len(v) != len(set(v)):
            raise ValueError("user_ids must be unique")
        return v
    
    model_config = {"json_schema_extra": {
        "example": {
            "user_ids": [123, 456, 789],
            "top_k": 5,
            "apply_diversity": True
        }
    }}


class SyncUsersRequest(BaseModel):
    """Request to sync user data."""
    users: List[dict] = Field(..., description="List of user data dictionaries", min_length=1)


class SyncRecipesRequest(BaseModel):
    """Request to sync recipe data."""
    recipes: List[dict] = Field(..., description="List of recipe data dictionaries", min_length=1)


class RecipeSimilarityRequest(BaseModel):
    """Request model for finding similar recipes by recipe id."""
    recipe_id: int = Field(..., description="Recipe ID to find similar recipes for", ge=1)
    top_k: int = Field(6, description="Number of similar recipes to return", ge=1, le=50)

    model_config = {"json_schema_extra": {
        "example": {
            "recipe_id": 10182,
            "top_k": 6
        }
    }}


class SyncInteractionsRequest(BaseModel):
    """Request to sync interaction data."""
    interactions: List[dict] = Field(..., description="List of interaction data dictionaries", min_length=1)
