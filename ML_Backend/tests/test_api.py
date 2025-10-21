"""
Integration tests for API endpoints.
Tests health check and recommendation endpoints using FastAPI TestClient.
"""
import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.models.model_loader import get_model_loader


@pytest.fixture(scope="module")
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture(scope="module")
def model_loader():
    """Get model loader and ensure models are loaded."""
    loader = get_model_loader()
    if not loader.is_loaded():
        try:
            loader.load_models()
        except Exception as e:
            pytest.skip(f"Models not available for testing: {e}")
    return loader


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check(self, client):
        """Test health check returns 200."""
        response = client.get("/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "models_loaded" in data
        assert "version" in data
        assert "uptime_seconds" in data
    
    def test_health_check_structure(self, client):
        """Test health check response structure."""
        response = client.get("/api/health")
        data = response.json()
        
        # Check required fields
        required_fields = [
            "status", "models_loaded", "cache_connected",
            "kafka_connected", "uptime_seconds", "version", "models"
        ]
        for field in required_fields:
            assert field in data
        
        # Check types
        assert isinstance(data["models_loaded"], bool)
        assert isinstance(data["cache_connected"], bool)
        assert isinstance(data["kafka_connected"], bool)
        assert isinstance(data["uptime_seconds"], (int, float))
        assert isinstance(data["models"], dict)
    
    def test_metrics_endpoint(self, client):
        """Test Prometheus metrics endpoint."""
        response = client.get("/api/metrics")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"
        
        # Check that response contains some metrics
        content = response.text
        assert len(content) > 0


class TestRecommendationEndpoints:
    """Test recommendation endpoints."""
    
    def test_recipe_recommendations_basic(self, client, model_loader):
        """Test basic recipe recommendation request."""
        if not model_loader.user_id_mapping:
            pytest.skip("No user mappings available")
        
        user_id = list(model_loader.user_id_mapping.keys())[0]
        
        request_data = {
            "user_id": user_id,
            "top_k": 5
        }
        
        response = client.post("/api/recommendations/recipes", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "recommendations" in data
        assert "model_used" in data
        assert "latency_ms" in data
        
        assert data["user_id"] == user_id
        assert isinstance(data["recommendations"], list)
        assert len(data["recommendations"]) <= 5
    
    def test_recipe_recommendations_with_filters(self, client, model_loader):
        """Test recommendations with filters."""
        if not model_loader.user_id_mapping:
            pytest.skip("No user mappings available")
        
        user_id = list(model_loader.user_id_mapping.keys())[0]
        
        request_data = {
            "user_id": user_id,
            "top_k": 5,
            "filters": {
                "max_cook_time": 60,
                "difficulty": "easy"
            }
        }
        
        response = client.post("/api/recommendations/recipes", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["recommendations"]) <= 5
        
        # Verify filters are respected (if results returned)
        for rec in data["recommendations"]:
            if rec.get("cook_time") is not None:
                assert rec["cook_time"] <= 60
            if rec.get("difficulty") is not None:
                assert rec["difficulty"].lower() == "easy"
    
    def test_recipe_recommendations_with_exclusions(self, client, model_loader):
        """Test recommendations with excluded recipe IDs."""
        if not model_loader.user_id_mapping or not model_loader.recipe_id_mapping:
            pytest.skip("No mappings available")
        
        user_id = list(model_loader.user_id_mapping.keys())[0]
        exclude_ids = list(model_loader.recipe_id_mapping.keys())[:3]
        
        request_data = {
            "user_id": user_id,
            "top_k": 5,
            "exclude_recipe_ids": exclude_ids
        }
        
        response = client.post("/api/recommendations/recipes", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        recommended_ids = [rec["recipe_id"] for rec in data["recommendations"]]
        
        # Verify excluded IDs are not in recommendations
        for exclude_id in exclude_ids:
            assert exclude_id not in recommended_ids
    
    def test_recipe_recommendations_invalid_user(self, client):
        """Test recommendations for invalid user ID."""
        request_data = {
            "user_id": 999999999,  # Unlikely to exist
            "top_k": 5
        }
        
        response = client.post("/api/recommendations/recipes", json=request_data)
        # Should return 404 or fallback to popularity
        # Implementation may vary, so we just check it doesn't crash
        assert response.status_code in [200, 404]
    
    def test_recipe_recommendations_validation(self, client):
        """Test request validation."""
        # Missing required field
        request_data = {
            "top_k": 5
        }
        
        response = client.post("/api/recommendations/recipes", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_batch_recommendations(self, client, model_loader):
        """Test batch recommendations endpoint."""
        if not model_loader.user_id_mapping or len(model_loader.user_id_mapping) < 3:
            pytest.skip("Not enough user mappings")
        
        user_ids = list(model_loader.user_id_mapping.keys())[:3]
        
        request_data = {
            "user_ids": user_ids,
            "top_k": 5
        }
        
        response = client.post("/api/recommendations/batch", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert "total_users" in data
        assert "successful_count" in data
        assert "latency_ms" in data
        
        assert data["total_users"] == len(user_ids)
        assert len(data["results"]) == len(user_ids)
    
    def test_batch_recommendations_size_limit(self, client):
        """Test batch size limit validation."""
        # Create request with too many users
        user_ids = list(range(1, 150))  # Exceeds MAX_BATCH_SIZE (100)
        
        request_data = {
            "user_ids": user_ids,
            "top_k": 5
        }
        
        response = client.post("/api/recommendations/batch", json=request_data)
        assert response.status_code == 400
    
    def test_cold_start_recommendations(self, client):
        """Test cold-start recommendations."""
        request_data = {
            "preferences": {
                "dietary_preferences": ["vegan"],
                "cuisine_preferences": ["italian"],
                "max_cook_time": 30,
                "difficulty_preference": "easy"
            },
            "top_k": 5
        }
        
        response = client.post("/api/recommendations/cold-start", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendations" in data
        assert "model_used" in data
        assert data["model_used"] == "cold_start"
        assert len(data["recommendations"]) <= 5


class TestSyncEndpoints:
    """Test data synchronization endpoints."""
    
    def test_sync_users(self, client):
        """Test user sync endpoint."""
        request_data = {
            "users": [
                {"user_id": 123, "name": "Test User"},
                {"user_id": 456, "name": "Another User"}
            ]
        }
        
        response = client.post("/api/sync/users", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "items_processed" in data
        assert data["items_processed"] >= 0
    
    def test_sync_recipes(self, client):
        """Test recipe sync endpoint."""
        request_data = {
            "recipes": [
                {"recipe_id": 789, "title": "Test Recipe"}
            ]
        }
        
        response = client.post("/api/sync/recipes", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "items_processed" in data
    
    def test_sync_interactions(self, client):
        """Test interaction sync endpoint."""
        request_data = {
            "interactions": [
                {"user_id": 123, "recipe_id": 456, "interaction_type": "view"}
            ]
        }
        
        response = client.post("/api/sync/interactions", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "items_processed" in data


class TestRootEndpoint:
    """Test root endpoint."""
    
    def test_root(self, client):
        """Test root endpoint returns basic info."""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
