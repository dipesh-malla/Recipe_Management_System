"""
Model loader for ALS and Two-Tower recommendation models.
Singleton pattern ensures models are loaded once and shared across requests.
"""
import pickle
import threading
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from scipy import sparse

from api.config.settings import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


# ===========================
# Two-Tower Model Architecture
# ===========================
# Architecture copied from Recipe_User_Recommendations.ipynb

class UserEncoder(nn.Module):
    """User tower encoder - EXACT match to trained model."""
    
    def __init__(self, n_users: int, user_feature_dim: int, embedding_dim: int = 128, hidden_dim: int = 256):
        super().__init__()
        self.user_embedding = nn.Embedding(n_users, embedding_dim)
        self.fc = nn.Sequential(
            nn.Linear(embedding_dim + user_feature_dim, hidden_dim),  # 256 output
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim),  # 256 -> 256
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, embedding_dim)  # 256 -> 128
        )
    
    def forward(self, user_ids: torch.Tensor, user_features: torch.Tensor) -> torch.Tensor:
        """Forward pass."""
        user_emb = self.user_embedding(user_ids)
        combined = torch.cat([user_emb, user_features], dim=-1)
        return self.fc(combined)


class RecipeEncoder(nn.Module):
    """Recipe tower encoder - EXACT match to trained model."""
    
    def __init__(self, n_recipes: int, recipe_feature_dim: int, embedding_dim: int = 128, hidden_dim: int = 256):
        super().__init__()
        self.recipe_embedding = nn.Embedding(n_recipes, embedding_dim)
        self.fc = nn.Sequential(
            nn.Linear(embedding_dim + recipe_feature_dim, hidden_dim),  # 256 output
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim),  # 256 -> 256
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, embedding_dim)  # 256 -> 128
        )
    
    def forward(self, recipe_ids: torch.Tensor, recipe_features: torch.Tensor) -> torch.Tensor:
        """Forward pass."""
        recipe_emb = self.recipe_embedding(recipe_ids)
        combined = torch.cat([recipe_emb, recipe_features], dim=-1)
        return self.fc(combined)


class TwoTowerModel(nn.Module):
    """Two-Tower recommendation model - EXACT match to trained model."""
    
    def __init__(
        self,
        n_users: int,
        n_recipes: int,
        user_feature_dim: int,
        recipe_feature_dim: int,
        embedding_dim: int = 128,  # Changed from 64 to 128
        hidden_dim: int = 256  # Changed from 128 to 256
    ):
        super().__init__()
        self.user_encoder = UserEncoder(n_users, user_feature_dim, embedding_dim, hidden_dim)
        self.recipe_encoder = RecipeEncoder(n_recipes, recipe_feature_dim, embedding_dim, hidden_dim)
    
    def forward(self, user_ids: torch.Tensor, user_features: torch.Tensor,
                recipe_ids: torch.Tensor, recipe_features: torch.Tensor) -> torch.Tensor:
        """Compute similarity scores between users and recipes."""
        user_emb = self.user_encoder(user_ids, user_features)
        recipe_emb = self.recipe_encoder(recipe_ids, recipe_features)
        
        # Cosine similarity
        user_emb = nn.functional.normalize(user_emb, p=2, dim=-1)
        recipe_emb = nn.functional.normalize(recipe_emb, p=2, dim=-1)
        
        # Dot product for similarity
        scores = torch.sum(user_emb * recipe_emb, dim=-1)
        return scores
    
    def get_user_embedding(self, user_ids: torch.Tensor, user_features: torch.Tensor) -> torch.Tensor:
        """Get user embeddings."""
        with torch.no_grad():
            emb = self.user_encoder(user_ids, user_features)
            return nn.functional.normalize(emb, p=2, dim=-1)
    
    def get_recipe_embedding(self, recipe_ids: torch.Tensor, recipe_features: torch.Tensor) -> torch.Tensor:
        """Get recipe embeddings."""
        with torch.no_grad():
            emb = self.recipe_encoder(recipe_ids, recipe_features)
            return nn.functional.normalize(emb, p=2, dim=-1)


# ===========================
# Model Loader (Singleton)
# ===========================

class ModelLoader:
    """
    Singleton model loader for ALS and Two-Tower models.
    Thread-safe loading with precomputed embeddings for fast inference.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize loader (called only once due to singleton)."""
        if hasattr(self, '_initialized'):
            return
        
        self._initialized = True
        self.device = torch.device(settings.DEVICE)
        
        # ALS model components
        self.als_user_factors: Optional[np.ndarray] = None
        self.als_item_factors: Optional[np.ndarray] = None
        self.als_user_mapping: Optional[Dict[int, int]] = None
        self.als_item_mapping: Optional[Dict[int, int]] = None
        self.als_reverse_item_mapping: Optional[Dict[int, int]] = None
        
        # Two-Tower model components
        self.two_tower_model: Optional[TwoTowerModel] = None
        self.two_tower_config: Optional[Dict[str, Any]] = None
        self.two_tower_scalers: Optional[Dict[str, Any]] = None
        self.user_id_mapping: Optional[Dict[int, int]] = None
        self.recipe_id_mapping: Optional[Dict[int, int]] = None
        self.reverse_recipe_mapping: Optional[Dict[int, int]] = None
        
        # Precomputed embeddings (for fast Two-Tower inference)
        self.recipe_embeddings: Optional[torch.Tensor] = None
        self.recipe_ids_tensor: Optional[torch.Tensor] = None
        
        # Metadata
        self.recipes_df: Optional[pd.DataFrame] = None
        self.popularity_scores: Optional[Dict[int, float]] = None
        
        self._models_loaded = False
        logger.info("ModelLoader initialized (singleton)")
    
    def load_models(self) -> None:
        """
        Load all models and precompute embeddings.
        Raises RuntimeError if required files are missing.
        """
        if self._models_loaded:
            logger.info("Models already loaded, skipping")
            return
        
        logger.info("Starting model loading process...")
        
        try:
            # Load mappings
            self._load_mappings()
            
            # Load metadata (recipes data)
            self._load_metadata()
            
            # Load ALS model
            self._load_als_model()
            
            # Load Two-Tower model
            self._load_two_tower_model()
            
            # Precompute recipe embeddings for Two-Tower
            if settings.PRECOMPUTE_EMBEDDINGS and self.two_tower_model is not None:
                self._precompute_recipe_embeddings()
            
            # Compute popularity scores for fallback
            self._compute_popularity_scores()
            
            self._models_loaded = True
            logger.info("✅ All models loaded successfully!")
            
        except Exception as e:
            logger.error(f"❌ Model loading failed: {e}")
            raise RuntimeError(f"Failed to load models: {e}") from e
    
    def _load_mappings(self) -> None:
        """Load user and recipe ID mappings."""
        logger.info("Loading mappings...")
        try:
            mappings_path = settings.get_mappings_path()
            with open(mappings_path, 'rb') as f:
                mappings = pickle.load(f)
            
            # Support both key naming conventions
            self.user_id_mapping = mappings.get('user_id_mapping', mappings.get('user_id_to_idx', {}))
            self.recipe_id_mapping = mappings.get('recipe_id_mapping', mappings.get('recipe_id_to_idx', {}))
            self.reverse_recipe_mapping = {v: k for k, v in self.recipe_id_mapping.items()}
            
            logger.info(f"  Users mapped: {len(self.user_id_mapping)}")
            logger.info(f"  Recipes mapped: {len(self.recipe_id_mapping)}")
            
        except FileNotFoundError as e:
            logger.error(f"Mappings file not found: {e}")
            raise
    
    def _load_metadata(self) -> None:
        """Load recipe metadata from CSV."""
        logger.info("Loading recipe metadata...")
        try:
            recipes_path = settings.get_recipes_data_path()
            self.recipes_df = pd.read_csv(recipes_path)
            
            # Normalize column names
            if 'id' in self.recipes_df.columns:
                self.recipes_df.rename(columns={'id': 'recipe_id'}, inplace=True)
            
            logger.info(f"  Recipes loaded: {len(self.recipes_df)}")
            
        except FileNotFoundError as e:
            logger.error(f"Recipes data file not found: {e}")
            raise
    
    def _load_als_model(self) -> None:
        """Load ALS model from pickle file."""
        logger.info("Loading ALS model...")
        try:
            als_path = settings.get_als_model_path()
            with open(als_path, 'rb') as f:
                als_data = pickle.load(f)
            
            self.als_user_factors = als_data.get('user_factors')
            self.als_item_factors = als_data.get('item_factors')
            self.als_user_mapping = als_data.get('user_mapping', {})
            self.als_item_mapping = als_data.get('item_mapping', {})
            self.als_reverse_item_mapping = {v: k for k, v in self.als_item_mapping.items()}
            
            logger.info(f"  ALS model loaded: {als_path.name}")
            logger.info(f"    User factors: {self.als_user_factors.shape}")
            logger.info(f"    Item factors: {self.als_item_factors.shape}")
            
        except FileNotFoundError as e:
            logger.warning(f"ALS model not found, skipping: {e}")
            # ALS is optional - we can fall back to Two-Tower
    
    def _load_two_tower_model(self) -> None:
        """Load Two-Tower PyTorch model."""
        logger.info("Loading Two-Tower model...")
        try:
            # Load config
            config_path = settings.get_two_tower_config_path()
            with open(config_path, 'rb') as f:
                self.two_tower_config = pickle.load(f)
            
            # Load scalers
            scalers_path = settings.get_two_tower_scalers_path()
            with open(scalers_path, 'rb') as f:
                self.two_tower_scalers = pickle.load(f)
            
            # Initialize model
            self.two_tower_model = TwoTowerModel(
                n_users=self.two_tower_config['n_users'],
                n_recipes=self.two_tower_config['n_recipes'],
                user_feature_dim=self.two_tower_config['user_feature_dim'],
                recipe_feature_dim=self.two_tower_config['recipe_feature_dim'],
                embedding_dim=self.two_tower_config.get('embedding_dim', 128),
                hidden_dim=self.two_tower_config.get('hidden_dim', 256)
            )
            
            # Load weights
            model_path = settings.get_two_tower_model_path()
            state_dict = torch.load(model_path, map_location=self.device)
            self.two_tower_model.load_state_dict(state_dict)
            self.two_tower_model.to(self.device)
            self.two_tower_model.eval()
            
            # Initialize feature service
            from api.services.feature_service import FeatureService
            self.feature_service = FeatureService(
                self.recipes_df,
                self.two_tower_config,
                self.two_tower_scalers
            )
            
            logger.info(f"  Two-Tower model loaded: {model_path.name}")
            logger.info(f"    Config: {self.two_tower_config}")
            
        except FileNotFoundError as e:
            logger.warning(f"Two-Tower model not found, skipping: {e}")
    
    def _precompute_recipe_embeddings(self) -> None:
        """Precompute all recipe embeddings for fast inference."""
        logger.info("Precomputing recipe embeddings...")
        
        if self.two_tower_model is None or self.recipes_df is None:
            logger.warning("Cannot precompute embeddings: model or data missing")
            return
        
        try:
            # Get all recipe IDs that are in the mapping
            recipe_ids = []
            recipe_indices = []
            
            for recipe_id in self.recipes_df['recipe_id'].values:
                if recipe_id in self.recipe_id_mapping:
                    recipe_ids.append(recipe_id)
                    recipe_indices.append(self.recipe_id_mapping[recipe_id])
            
            # Prepare recipe features
            from api.services.feature_service import FeatureService
            feature_service = FeatureService(
                self.recipes_df,
                self.two_tower_config,
                self.two_tower_scalers
            )
            
            recipe_features_list = []
            for recipe_id in recipe_ids:
                features = feature_service.get_recipe_features(recipe_id)
                recipe_features_list.append(features)
            
            # Convert to tensors
            self.recipe_ids_tensor = torch.tensor(recipe_indices, dtype=torch.long, device=self.device)
            recipe_features_tensor = torch.tensor(
                np.array(recipe_features_list),
                dtype=torch.float32,
                device=self.device
            )
            
            # Compute embeddings
            with torch.no_grad():
                self.recipe_embeddings = self.two_tower_model.get_recipe_embedding(
                    self.recipe_ids_tensor,
                    recipe_features_tensor
                )
            
            logger.info(f"  Precomputed {len(recipe_ids)} recipe embeddings")
            
        except Exception as e:
            logger.error(f"Failed to precompute embeddings: {e}")
            # Non-fatal, we can still compute on-demand
    
    def _compute_popularity_scores(self) -> None:
        """Compute popularity scores for fallback recommendations."""
        if self.recipes_df is None:
            return
        
        logger.info("Computing popularity scores...")
        
        # Use popularity_score if available, otherwise compute from engagement
        if 'popularity_score' in self.recipes_df.columns:
            self.popularity_scores = dict(
                zip(self.recipes_df['recipe_id'], self.recipes_df['popularity_score'])
            )
        else:
            # Compute simple popularity from metrics
            engagement_cols = ['view_count', 'save_count', 'like_count', 'avg_rating']
            available_cols = [col for col in engagement_cols if col in self.recipes_df.columns]
            
            if available_cols:
                # Normalize and combine
                scores = self.recipes_df[available_cols].fillna(0).copy()
                for col in available_cols:
                    max_val = scores[col].max()
                    if max_val > 0:
                        scores[col] = scores[col] / max_val
                
                popularity = scores.mean(axis=1)
                self.popularity_scores = dict(zip(self.recipes_df['recipe_id'], popularity))
            else:
                # Fallback: all equal
                self.popularity_scores = {
                    rid: 1.0 for rid in self.recipes_df['recipe_id']
                }
        
        logger.info(f"  Popularity scores computed for {len(self.popularity_scores)} recipes")
    
    # ===========================
    # Public API Methods
    # ===========================
    
    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self._models_loaded
    
    def get_status(self) -> Dict[str, bool]:
        """Get status of individual models."""
        return {
            'two_tower': self.two_tower_model is not None,
            'als': self.als_user_factors is not None,
            'metadata': self.recipes_df is not None,
            'embeddings_precomputed': self.recipe_embeddings is not None
        }
    
    def recommend_two_tower(
        self,
        user_id: int,
        top_k: int = 10,
        exclude_recipe_ids: Optional[List[int]] = None
    ) -> Tuple[List[int], List[float]]:
        """
        Generate recommendations using Two-Tower model.
        
        Returns:
            Tuple of (recipe_ids, scores)
        """
        if self.two_tower_model is None:
            raise RuntimeError("Two-Tower model not loaded")
        
        # Check if user exists in mapping
        if user_id not in self.user_id_mapping:
            raise ValueError(f"User ID {user_id} not found in mappings")
        
        user_idx = self.user_id_mapping[user_id]
        exclude_set = set(exclude_recipe_ids) if exclude_recipe_ids else set()
        
        try:
            from api.services.feature_service import FeatureService
            feature_service = FeatureService(
                self.recipes_df,
                self.two_tower_config,
                self.two_tower_scalers
            )
            
            # Get user features (from Java backend or default)
            user_features = feature_service.get_user_features(user_id)
            
            user_ids_tensor = torch.tensor([user_idx], dtype=torch.long, device=self.device)
            user_features_tensor = torch.tensor([user_features], dtype=torch.float32, device=self.device)
            
            with torch.no_grad():
                user_emb = self.two_tower_model.get_user_embedding(user_ids_tensor, user_features_tensor)
                
                # Use precomputed embeddings if available
                if self.recipe_embeddings is not None:
                    # Compute scores for all recipes at once
                    scores = torch.matmul(user_emb, self.recipe_embeddings.T).squeeze(0)
                    scores_np = scores.cpu().numpy()
                    
                    # Get top-k indices
                    all_recipe_indices = np.arange(len(scores_np))
                    
                    # Filter out excluded recipes
                    valid_mask = np.ones(len(scores_np), dtype=bool)
                    for i, recipe_idx in enumerate(self.recipe_ids_tensor.cpu().numpy()):
                        recipe_id = self.reverse_recipe_mapping.get(recipe_idx)
                        if recipe_id in exclude_set:
                            valid_mask[i] = False
                    
                    valid_indices = all_recipe_indices[valid_mask]
                    valid_scores = scores_np[valid_mask]
                    
                    # Get top-k
                    top_indices = np.argsort(valid_scores)[::-1][:top_k]
                    top_recipe_internal_ids = self.recipe_ids_tensor[valid_indices[top_indices]].cpu().numpy()
                    top_scores = valid_scores[top_indices]
                    
                    # Map back to original recipe IDs
                    top_recipe_ids = [
                        self.reverse_recipe_mapping[int(rid)] for rid in top_recipe_internal_ids
                    ]
                    
                    # Normalize scores to 0-1
                    if len(top_scores) > 0 and top_scores.max() > 0:
                        top_scores = (top_scores - top_scores.min()) / (top_scores.max() - top_scores.min() + 1e-8)
                    
                    return top_recipe_ids, top_scores.tolist()
                
                else:
                    # Fallback: compute on-demand (slower)
                    logger.warning("Using on-demand embedding computation (slower)")
                    raise NotImplementedError("On-demand Two-Tower inference not implemented yet")
            
        except Exception as e:
            logger.error(f"Two-Tower recommendation failed: {e}")
            raise
    
    def recommend_als(
        self,
        user_id: int,
        top_k: int = 10,
        exclude_recipe_ids: Optional[List[int]] = None
    ) -> Tuple[List[int], List[float]]:
        """
        Generate recommendations using ALS model.
        
        Returns:
            Tuple of (recipe_ids, scores)
        """
        if self.als_user_factors is None:
            raise RuntimeError("ALS model not loaded")
        
        if user_id not in self.als_user_mapping:
            raise ValueError(f"User ID {user_id} not found in ALS mappings")
        
        user_idx = self.als_user_mapping[user_id]
        exclude_set = set(exclude_recipe_ids) if exclude_recipe_ids else set()
        
        try:
            # Get user factors
            user_factor = self.als_user_factors[user_idx]
            
            # Compute scores for all items
            scores = self.als_item_factors.dot(user_factor)
            
            # Filter out excluded items
            valid_indices = []
            valid_scores = []
            
            for item_idx, score in enumerate(scores):
                item_id = self.als_reverse_item_mapping.get(item_idx)
                if item_id and item_id not in exclude_set:
                    valid_indices.append(item_id)
                    valid_scores.append(score)
            
            # Get top-k
            valid_scores_np = np.array(valid_scores)
            top_indices = np.argsort(valid_scores_np)[::-1][:top_k]
            
            top_recipe_ids = [valid_indices[i] for i in top_indices]
            top_scores = valid_scores_np[top_indices]
            
            # Normalize scores to 0-1
            if len(top_scores) > 0 and top_scores.max() > top_scores.min():
                top_scores = (top_scores - top_scores.min()) / (top_scores.max() - top_scores.min())
            
            return top_recipe_ids, top_scores.tolist()
            
        except Exception as e:
            logger.error(f"ALS recommendation failed: {e}")
            raise
    
    def get_popular_recipes(
        self,
        top_k: int = 10,
        exclude_recipe_ids: Optional[List[int]] = None
    ) -> Tuple[List[int], List[float]]:
        """
        Get popular recipes as fallback.
        
        Returns:
            Tuple of (recipe_ids, scores)
        """
        if self.popularity_scores is None:
            raise RuntimeError("Popularity scores not computed")
        
        exclude_set = set(exclude_recipe_ids) if exclude_recipe_ids else set()
        
        # Filter and sort
        valid_items = [
            (rid, score) for rid, score in self.popularity_scores.items()
            if rid not in exclude_set
        ]
        
        valid_items.sort(key=lambda x: x[1], reverse=True)
        top_items = valid_items[:top_k]
        
        recipe_ids = [item[0] for item in top_items]
        scores = [item[1] for item in top_items]
        
        # Normalize
        if scores and max(scores) > min(scores):
            scores_np = np.array(scores)
            scores = ((scores_np - min(scores)) / (max(scores) - min(scores))).tolist()
        
        return recipe_ids, scores
    
    def get_recipe_metadata(self, recipe_id: int) -> Optional[Dict[str, Any]]:
        """Get recipe metadata by ID."""
        if self.recipes_df is None:
            return None
        
        recipe_row = self.recipes_df[self.recipes_df['recipe_id'] == recipe_id]
        if recipe_row.empty:
            return None
        
        return recipe_row.iloc[0].to_dict()
    
    def get_feature_service(self):
        """Get the feature service instance."""
        return getattr(self, 'feature_service', None)


# Singleton instance getter
_model_loader_instance: Optional[ModelLoader] = None

def get_model_loader() -> ModelLoader:
    """Get the singleton ModelLoader instance."""
    global _model_loader_instance
    if _model_loader_instance is None:
        _model_loader_instance = ModelLoader()
    return _model_loader_instance
