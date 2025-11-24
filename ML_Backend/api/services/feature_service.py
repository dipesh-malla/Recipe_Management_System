"""
Feature service for extracting and processing features for ML models.
Handles feature engineering, scaling, and mapping for Two-Tower model.
"""
from typing import Dict, List, Optional, Any
import numpy as np
import pandas as pd
import httpx

from api.config.settings import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


class FeatureService:
    """Service for feature extraction and processing."""
    
    def __init__(
        self,
        recipes_df: pd.DataFrame,
        model_config: Dict[str, Any],
        scalers: Dict[str, Any]
    ):
        """
        Initialize feature service.
        
        Args:
            recipes_df: DataFrame with recipe data
            model_config: Model configuration with feature columns
            scalers: Dictionary of feature scalers
        """
        self.recipes_df = recipes_df
        self.model_config = model_config
        self.scalers = scalers
        
        self.user_feature_cols = model_config.get('user_feature_cols', [])
        self.recipe_feature_cols = model_config.get('recipe_feature_cols', [])
        
        # HTTP client for Java backend calls
        self.http_client: Optional[httpx.AsyncClient] = None
    
    async def initialize(self) -> None:
        """Initialize async HTTP client."""
        self.http_client = httpx.AsyncClient(
            base_url=settings.JAVA_BACKEND_URL,
            timeout=settings.JAVA_BACKEND_TIMEOUT
        )
        logger.info("Feature service initialized")
    
    async def cleanup(self) -> None:
        """Cleanup resources."""
        if self.http_client:
            await self.http_client.aclose()
    
    async def fetch_user_from_backend(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetch user data from Java backend.
        
        Args:
            user_id: User ID
        
        Returns:
            User data dictionary or None if not found
        """
        if not self.http_client:
            await self.initialize()
        
        try:
            # TODO: Update with actual Java backend endpoint
            # Example: /api/users/{user_id}
            response = await self.http_client.get(f"/api/users/{user_id}")
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                logger.warning(f"User {user_id} not found in backend")
                return None
            else:
                logger.error(f"Backend error fetching user {user_id}: {response.status_code}")
                return None
                
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching user {user_id} from backend")
            return None
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {e}")
            return None
    
    def get_user_features(self, user_id: int, user_data: Optional[Dict[str, Any]] = None) -> np.ndarray:
        """
        Extract user features for model input.
        
        Args:
            user_id: User ID
            user_data: Optional user data dict from Java backend
        
        Returns:
            Numpy array of user features
        """
        # If no user data provided, use default features
        if user_data is None:
            # Default user features (all zeros except for general user segment)
            features = np.zeros(len(self.user_feature_cols))
            
            # Try to set a default segment if available
            for i, col in enumerate(self.user_feature_cols):
                if 'user_segment_General Users' in col:
                    features[i] = 1.0
                    break
            
            return features
        
        # Extract features from user_data
        features = []
        for col in self.user_feature_cols:
            if col in user_data:
                features.append(float(user_data[col]))
            else:
                # Parse column name for one-hot encoding
                if col.startswith('gender_'):
                    gender = user_data.get('gender', '')
                    suffix = col.split('_', 1)[1]
                    features.append(1.0 if gender == suffix else 0.0)
                elif col.startswith('location_'):
                    location = user_data.get('location', '')
                    suffix = col.split('_', 1)[1]
                    features.append(1.0 if location == suffix else 0.0)
                elif col.startswith('user_segment_'):
                    segment = user_data.get('user_segment', '')
                    suffix = col.split('_', 2)[2] if len(col.split('_')) > 2 else ''
                    features.append(1.0 if segment == suffix else 0.0)
                elif col == 'age':
                    features.append(float(user_data.get('age', 30)))  # Default age 30
                else:
                    features.append(0.0)
        
        features_array = np.array(features, dtype=np.float32)
        
        # Apply scaling if available
        if 'user_scaler' in self.scalers:
            try:
                features_array = self.scalers['user_scaler'].transform(features_array.reshape(1, -1))[0]
            except Exception as e:
                logger.warning(f"Failed to apply user feature scaling: {e}")
        
        return features_array
    
    def get_recipe_features(self, recipe_id: int) -> np.ndarray:
        """
        Extract recipe features for model input.
        
        Args:
            recipe_id: Recipe ID
        
        Returns:
            Numpy array of recipe features
        """
        # Find recipe in DataFrame
        recipe_row = self.recipes_df[self.recipes_df['recipe_id'] == recipe_id]
        
        if recipe_row.empty:
            logger.warning(f"Recipe {recipe_id} not found in data, using default features")
            return np.zeros(len(self.recipe_feature_cols), dtype=np.float32)
        
        recipe_data = recipe_row.iloc[0]
        
        # Extract features
        features = []
        for col in self.recipe_feature_cols:
            if col in recipe_data:
                value = recipe_data[col]
                # Handle NaN values
                if pd.isna(value):
                    features.append(0.0)
                else:
                    features.append(float(value))
            else:
                features.append(0.0)
        
        features_array = np.array(features, dtype=np.float32)
        
        # Apply scaling if available
        if 'recipe_scaler' in self.scalers:
            try:
                features_array = self.scalers['recipe_scaler'].transform(features_array.reshape(1, -1))[0]
            except Exception as e:
                logger.warning(f"Failed to apply recipe feature scaling: {e}")
        
        return features_array
    
    def get_batch_recipe_features(self, recipe_ids: List[int]) -> np.ndarray:
        """
        Extract features for multiple recipes efficiently.
        
        Args:
            recipe_ids: List of recipe IDs
        
        Returns:
            2D numpy array of recipe features
        """
        features_list = []
        for recipe_id in recipe_ids:
            features = self.get_recipe_features(recipe_id)
            features_list.append(features)
        
        return np.array(features_list, dtype=np.float32)
    
    def filter_recipes_by_criteria(
        self,
        recipe_ids: List[int],
        filters: Optional[Dict[str, Any]] = None
    ) -> List[int]:
        """
        Filter recipes by dietary type, cuisine, cook time, etc.
        
        Args:
            recipe_ids: List of recipe IDs to filter
            filters: Dictionary of filter criteria
        
        Returns:
            Filtered list of recipe IDs
        """
        if not filters:
            return recipe_ids
        
        # Filter recipes
        filtered_df = self.recipes_df[self.recipes_df['recipe_id'].isin(recipe_ids)].copy()
        
        # Apply filters
        if 'dietary_type' in filters and filters['dietary_type']:
            dietary_col = f"dietary_type_{filters['dietary_type'].title()}"
            if dietary_col in filtered_df.columns:
                filtered_df = filtered_df[filtered_df[dietary_col] == 1]
            elif 'dietary_type' in filtered_df.columns:
                filtered_df = filtered_df[
                    filtered_df['dietary_type'].str.lower() == filters['dietary_type'].lower()
                ]
        
        if 'cuisine' in filters and filters['cuisine']:
            cuisine_col = f"cuisine_{filters['cuisine'].title()}"
            if cuisine_col in filtered_df.columns:
                filtered_df = filtered_df[filtered_df[cuisine_col] == 1]
            elif 'cuisine' in filtered_df.columns:
                filtered_df = filtered_df[
                    filtered_df['cuisine'].str.lower() == filters['cuisine'].lower()
                ]
        
        if 'max_cook_time' in filters and filters['max_cook_time'] is not None:
            if 'cook_time' in filtered_df.columns:
                filtered_df = filtered_df[filtered_df['cook_time'] <= filters['max_cook_time']]
        
        if 'min_cook_time' in filters and filters['min_cook_time'] is not None:
            if 'cook_time' in filtered_df.columns:
                filtered_df = filtered_df[filtered_df['cook_time'] >= filters['min_cook_time']]
        
        if 'difficulty' in filters and filters['difficulty']:
            difficulty_col = f"difficulty_{filters['difficulty'].title()}"
            if difficulty_col in filtered_df.columns:
                filtered_df = filtered_df[filtered_df[difficulty_col] == 1]
            elif 'difficulty' in filtered_df.columns:
                filtered_df = filtered_df[
                    filtered_df['difficulty'].str.lower() == filters['difficulty'].lower()
                ]
        
        if 'max_calories' in filters and filters['max_calories'] is not None:
            if 'calories_per_serving' in filtered_df.columns:
                filtered_df = filtered_df[filtered_df['calories_per_serving'] <= filters['max_calories']]
        
        if 'cooking_method' in filters and filters['cooking_method']:
            method_col = f"cooking_method_{filters['cooking_method'].title()}"
            if method_col in filtered_df.columns:
                filtered_df = filtered_df[filtered_df[method_col] == 1]
        
        return filtered_df['recipe_id'].tolist()
