"""
Unit tests for model loading and inference.
Tests ALS and Two-Tower model loading and basic recommendation functions.
"""
import pytest
import numpy as np
from pathlib import Path

from api.models.model_loader import ModelLoader, get_model_loader
from api.config.settings import settings


class TestModelLoader:
    """Test suite for ModelLoader."""
    
    @pytest.fixture(scope="class")
    def model_loader(self):
        """Fixture to get model loader instance."""
        loader = get_model_loader()
        # Only load if not already loaded
        if not loader.is_loaded():
            try:
                loader.load_models()
            except Exception as e:
                pytest.skip(f"Models not available for testing: {e}")
        return loader
    
    def test_singleton_pattern(self):
        """Test that ModelLoader follows singleton pattern."""
        loader1 = get_model_loader()
        loader2 = get_model_loader()
        assert loader1 is loader2
    
    def test_models_loaded(self, model_loader):
        """Test that models are loaded successfully."""
        assert model_loader.is_loaded()
        
        status = model_loader.get_status()
        # At least one model should be loaded
        assert any(status.values()), "No models loaded"
    
    def test_als_model_structure(self, model_loader):
        """Test ALS model has correct structure."""
        if model_loader.als_user_factors is None:
            pytest.skip("ALS model not loaded")
        
        assert model_loader.als_user_factors is not None
        assert model_loader.als_item_factors is not None
        assert model_loader.als_user_mapping is not None
        assert model_loader.als_item_mapping is not None
        
        # Check shapes are compatible
        assert model_loader.als_user_factors.ndim == 2
        assert model_loader.als_item_factors.ndim == 2
        assert model_loader.als_user_factors.shape[1] == model_loader.als_item_factors.shape[1]
    
    def test_two_tower_model_structure(self, model_loader):
        """Test Two-Tower model has correct structure."""
        if model_loader.two_tower_model is None:
            pytest.skip("Two-Tower model not loaded")
        
        assert model_loader.two_tower_model is not None
        assert model_loader.two_tower_config is not None
        assert model_loader.two_tower_scalers is not None
        
        # Check config has required keys
        required_keys = ['n_users', 'n_recipes', 'user_feature_dim', 'recipe_feature_dim']
        for key in required_keys:
            assert key in model_loader.two_tower_config
    
    def test_mappings_loaded(self, model_loader):
        """Test that ID mappings are loaded."""
        assert model_loader.user_id_mapping is not None
        assert model_loader.recipe_id_mapping is not None
        assert len(model_loader.user_id_mapping) > 0
        assert len(model_loader.recipe_id_mapping) > 0
    
    def test_metadata_loaded(self, model_loader):
        """Test that recipe metadata is loaded."""
        assert model_loader.recipes_df is not None
        assert len(model_loader.recipes_df) > 0
        assert 'recipe_id' in model_loader.recipes_df.columns
    
    def test_popularity_scores(self, model_loader):
        """Test popularity scores are computed."""
        assert model_loader.popularity_scores is not None
        assert len(model_loader.popularity_scores) > 0
    
    def test_als_recommendation(self, model_loader):
        """Test ALS recommendation generation."""
        if model_loader.als_user_factors is None:
            pytest.skip("ALS model not loaded")
        
        # Get a valid user ID from mappings
        if not model_loader.als_user_mapping:
            pytest.skip("No ALS user mappings")
        
        user_id = list(model_loader.als_user_mapping.keys())[0]
        
        # Generate recommendations
        recipe_ids, scores = model_loader.recommend_als(user_id, top_k=5)
        
        assert len(recipe_ids) > 0
        assert len(scores) > 0
        assert len(recipe_ids) == len(scores)
        assert len(recipe_ids) <= 5
        
        # Check scores are valid
        assert all(isinstance(s, (int, float)) for s in scores)
        assert all(0 <= s <= 1 for s in scores)
        
        # Check IDs are valid
        assert all(isinstance(rid, int) for rid in recipe_ids)
    
    def test_two_tower_recommendation(self, model_loader):
        """Test Two-Tower recommendation generation."""
        if model_loader.two_tower_model is None:
            pytest.skip("Two-Tower model not loaded")
        
        # Get a valid user ID from mappings
        if not model_loader.user_id_mapping:
            pytest.skip("No user mappings")
        
        user_id = list(model_loader.user_id_mapping.keys())[0]
        
        # Generate recommendations
        recipe_ids, scores = model_loader.recommend_two_tower(user_id, top_k=5)
        
        assert len(recipe_ids) > 0
        assert len(scores) > 0
        assert len(recipe_ids) == len(scores)
        assert len(recipe_ids) <= 5
        
        # Check scores are valid
        assert all(isinstance(s, (int, float)) for s in scores)
        
        # Check IDs are valid
        assert all(isinstance(rid, int) for rid in recipe_ids)
    
    def test_popular_recipes(self, model_loader):
        """Test popularity-based recommendations."""
        recipe_ids, scores = model_loader.get_popular_recipes(top_k=10)
        
        assert len(recipe_ids) > 0
        assert len(scores) > 0
        assert len(recipe_ids) == len(scores)
        assert len(recipe_ids) <= 10
        
        # Scores should be in descending order (most popular first)
        assert scores == sorted(scores, reverse=True)
    
    def test_exclude_recipes(self, model_loader):
        """Test that excluded recipes are not in recommendations."""
        if model_loader.popularity_scores is None:
            pytest.skip("Popularity scores not loaded")
        
        all_recipe_ids = list(model_loader.popularity_scores.keys())[:10]
        exclude_ids = all_recipe_ids[:5]
        
        recipe_ids, scores = model_loader.get_popular_recipes(
            top_k=10,
            exclude_recipe_ids=exclude_ids
        )
        
        # Check excluded IDs are not in results
        for exclude_id in exclude_ids:
            assert exclude_id not in recipe_ids
    
    def test_recipe_metadata_retrieval(self, model_loader):
        """Test retrieving recipe metadata."""
        if model_loader.recipes_df is None or len(model_loader.recipes_df) == 0:
            pytest.skip("No recipe data loaded")
        
        recipe_id = model_loader.recipes_df['recipe_id'].iloc[0]
        metadata = model_loader.get_recipe_metadata(recipe_id)
        
        assert metadata is not None
        assert 'recipe_id' in metadata
        assert metadata['recipe_id'] == recipe_id
    
    def test_precomputed_embeddings(self, model_loader):
        """Test that recipe embeddings are precomputed if enabled."""
        if not settings.PRECOMPUTE_EMBEDDINGS:
            pytest.skip("Embedding precomputation disabled")
        
        if model_loader.two_tower_model is None:
            pytest.skip("Two-Tower model not loaded")
        
        assert model_loader.recipe_embeddings is not None
        assert model_loader.recipe_ids_tensor is not None
