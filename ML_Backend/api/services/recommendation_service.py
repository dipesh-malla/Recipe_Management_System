"""
Recommendation service with business logic for generating recommendations.
Implements model fallback strategy, MMR diversity, filtering, and caching.
"""

import time
import requests
from typing import List, Tuple, Dict, Optional, Any
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor

from api.config.settings import settings
from api.models.model_loader import get_model_loader
from api.services.cache_service import get_cache_service
from api.services.feature_service import FeatureService
from api.schemas.request import RecipeFilters, UserPreferences
from api.schemas.response import RecipeRecommendation
from api.utils.logger import get_logger
from api.utils.metrics import metrics

logger = get_logger(__name__)

# Singleton instance
_recommendation_service_instance: Optional['RecommendationService'] = None


def get_recommendation_service() -> 'RecommendationService':
    """Get singleton recommendation service instance."""
    global _recommendation_service_instance
    if _recommendation_service_instance is None:
        _recommendation_service_instance = RecommendationService()
        _recommendation_service_instance.initialize()
    return _recommendation_service_instance


class RecommendationService:
    def fetch_recipes_from_db(self, recipe_ids):
        """
        Fetch recipe metadata for a list of recipe_ids from PostgreSQL, joining users and counting comments.
        Returns a dict mapping recipe_id to metadata dict.
        """
        conn = psycopg2.connect(
            host=settings.POSTGRES_HOST,
            dbname=settings.POSTGRES_DB,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            port=settings.POSTGRES_PORT
        )
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                                # Join recipes and users, select like_count, and count comments
                                  sql = """
                                  SELECT r.id, r.title, r.cuisine, r.dietary_type, r.cook_time, r.difficulty, r.calories_per_serving, r.avg_rating,
                                      u.display_name AS chef, r.like_count, r.comment_count,
                                      (SELECT COUNT(*) FROM recipe_comments rc WHERE rc.recipe_id = r.id) AS comments
                                  FROM recipes r
                                  LEFT JOIN users u ON r.author_id = u.id
                                  WHERE r.id = ANY(%s)
                                  """
                                  cur.execute(sql, (list(recipe_ids),))
                                  rows = cur.fetchall()
                                  return {row['id']: row for row in rows}
        finally:
            conn.close()
    @staticmethod
    def _clean_metadata_value(value, field):
        """Return None for static/placeholder values, else the real value."""
        static_values = {
            "chef": ["", None],
            "likes": ["", "0", "static likes", "likes", "n/a", "none", None],
            "comments": ["", "0", "static comments", "comments", "n/a", "none", None]
        }
        if field == "chef":
            if not isinstance(value, str) or value.strip() in static_values["chef"]:
                return "Unknown"
            return value.strip()
        if field in ["likes", "comments"]:
            # Accept only positive integers
            try:
                int_val = int(value)
                if int_val <= 0 or str(value).strip().lower() in static_values[field]:
                    return 0
                return int_val
            except (TypeError, ValueError):
                return 0
        return value

    # In-memory cache for recipe details
    _recipe_cache = {}
    
    def __init__(self):
        """Initialize recommendation service."""
        self.model_loader = get_model_loader()
        self.cache_service = get_cache_service()
        self.feature_service = None
        self._initialized = False
    
    def initialize(self) -> None:
        """Initialize service with feature service."""
        if self._initialized:
            return
            
        if self.model_loader.recipes_df is not None and self.model_loader.two_tower_config:
            self.feature_service = FeatureService(
                self.model_loader.recipes_df,
                self.model_loader.two_tower_config,
                self.model_loader.two_tower_scalers or {}
            )
            self._initialized = True
            logger.info("RecommendationService initialized")
    
    async def get_recommendations(
        self,
        user_id: int,
        top_k: int = 10,
        exclude_recipe_ids: Optional[List[int]] = None,
        filters: Optional[RecipeFilters] = None,
        apply_diversity: bool = True,
        diversity_weight: Optional[float] = None
    ) -> Tuple[List[RecipeRecommendation], str, bool, float]:
        """
        Get recipe recommendations for a user with fallback strategy.
        
        Strategy:
        1. Try Two-Tower model
        2. Fallback to ALS if Two-Tower fails
        3. Fallback to popularity if both fail
        
        Args:
            user_id: User ID
            top_k: Number of recommendations
            exclude_recipe_ids: Recipe IDs to exclude
            filters: Recipe filters
            apply_diversity: Apply MMR diversity
            diversity_weight: Diversity weight (overrides default)
        
        Returns:
            Tuple of (recommendations, model_used, cached, latency_ms)
        """
        start_time = time.time()
        exclude_recipe_ids = exclude_recipe_ids or []
        
        # Check cache first
        cache_key = self.cache_service.get_cache_key(
            "recommendations:user",
            user_id=user_id,
            top_k=top_k,
            exclude=exclude_recipe_ids,
            filters=filters.model_dump() if filters else None
        )
        
        cached_result = await self.cache_service.get(cache_key)
        if cached_result:
            latency_ms = (time.time() - start_time) * 1000
            logger.info(f"Cache hit for user {user_id}", extra={"latency_ms": latency_ms})
            metrics.cache_hit_count.labels(cache_type="recommendations").inc()
            
            recommendations = [RecipeRecommendation(**r) for r in cached_result['recommendations']]
            return recommendations, cached_result['model_used'], True, latency_ms
        
        metrics.cache_miss_count.labels(cache_type="recommendations").inc()
        
        # Generate recommendations with fallback
        recipe_ids, scores, model_used = await self._generate_with_fallback(
            user_id, top_k * 3, exclude_recipe_ids  # Over-fetch for filtering
        )
        
        # Apply filters
        if filters:
            recipe_ids, scores = self._apply_filters(recipe_ids, scores, filters)
        
        # Apply diversity if requested
        if apply_diversity and len(recipe_ids) > top_k:
            diversity_lambda = diversity_weight if diversity_weight is not None else settings.MMR_DIVERSITY_WEIGHT
            recipe_ids, scores = self._apply_mmr_diversity(
                recipe_ids, scores, top_k, diversity_lambda
            )
        else:
            recipe_ids = recipe_ids[:top_k]
            scores = scores[:top_k]
        
        # Build recommendation objects
        recommendations = self._build_recommendations(recipe_ids, scores, model_used)
        
        # Cache results
        await self.cache_service.set(
            cache_key,
            {
                'recommendations': [r.model_dump() for r in recommendations],
                'model_used': model_used
            }
        )
        
        latency_ms = (time.time() - start_time) * 1000
        metrics.recommendation_count.labels(model=model_used, cached=False).inc()
        
        logger.info(
            f"Generated {len(recommendations)} recommendations for user {user_id}",
            extra={"model": model_used, "latency_ms": latency_ms}
        )
        
        return recommendations, model_used, False, latency_ms
    
    async def _generate_with_fallback(
        self,
        user_id: int,
        top_k: int,
        exclude_recipe_ids: List[int]
    ) -> Tuple[List[int], List[float], str]:
        """
        Generate recommendations with model fallback.
        
        Returns:
            Tuple of (recipe_ids, scores, model_used)
        """
        # Try Two-Tower first
        if self.model_loader.two_tower_model is not None:
            try:
                start = time.time()
                recipe_ids, scores = self.model_loader.recommend_two_tower(
                    user_id, top_k, exclude_recipe_ids
                )
                metrics.model_inference_duration.labels(model="two_tower").observe(time.time() - start)
                metrics.model_usage_count.labels(model="two_tower").inc()
                # Convert numpy types to native Python types
                py_recipe_ids = [int(rid) if hasattr(rid, 'item') or type(rid).__module__ == 'numpy' else rid for rid in recipe_ids]
                py_scores = [float(s) if hasattr(s, 'item') or type(s).__module__ == 'numpy' else s for s in scores]
                return py_recipe_ids, py_scores, "two_tower"
            except ValueError as e:
                logger.warning(f"Two-Tower failed for user {user_id}: {e}, trying ALS")
            except Exception as e:
                logger.error(f"Two-Tower error for user {user_id}: {e}, trying ALS")
                metrics.error_count.labels(error_type="two_tower_failure", endpoint="recommendations").inc()
        
        # Fallback to ALS
        if self.model_loader.als_user_factors is not None:
            try:
                start = time.time()
                recipe_ids, scores = self.model_loader.recommend_als(
                    user_id, top_k, exclude_recipe_ids
                )
                metrics.model_inference_duration.labels(model="als").observe(time.time() - start)
                metrics.model_usage_count.labels(model="als").inc()
                py_recipe_ids = [int(rid) if hasattr(rid, 'item') or type(rid).__module__ == 'numpy' else rid for rid in recipe_ids]
                py_scores = [float(s) if hasattr(s, 'item') or type(s).__module__ == 'numpy' else s for s in scores]
                return py_recipe_ids, py_scores, "als"
            except ValueError as e:
                logger.warning(f"ALS failed for user {user_id}: {e}, using popularity")
            except Exception as e:
                logger.error(f"ALS error for user {user_id}: {e}, using popularity")
                metrics.error_count.labels(error_type="als_failure", endpoint="recommendations").inc()
        
        # Final fallback: popularity
        logger.info(f"Using popularity fallback for user {user_id}")
        start = time.time()
        recipe_ids, scores = self.model_loader.get_popular_recipes(top_k, exclude_recipe_ids)
        metrics.model_inference_duration.labels(model="popularity").observe(time.time() - start)
        metrics.model_usage_count.labels(model="popularity").inc()
        py_recipe_ids = [int(rid) if hasattr(rid, 'item') or type(rid).__module__ == 'numpy' else rid for rid in recipe_ids]
        py_scores = [float(s) if hasattr(s, 'item') or type(s).__module__ == 'numpy' else s for s in scores]
        return py_recipe_ids, py_scores, "popularity"
    
    def _apply_filters(
        self,
        recipe_ids: List[int],
        scores: List[float],
        filters: RecipeFilters
    ) -> Tuple[List[int], List[float]]:
        """Apply recipe filters and maintain score order."""
        if not self.feature_service:
            logger.warning("FeatureService not initialized, skipping filters")
            py_recipe_ids = [int(rid) if hasattr(rid, 'item') or type(rid).__module__ == 'numpy' else rid for rid in recipe_ids]
            py_scores = [float(s) if hasattr(s, 'item') or type(s).__module__ == 'numpy' else s for s in scores]
            return py_recipe_ids, py_scores
        
        # Convert filters to dict
        filter_dict = {k: v for k, v in filters.model_dump().items() if v is not None}
        
        # Filter recipes
        filtered_ids = self.feature_service.filter_recipes_by_criteria(recipe_ids, filter_dict)
        
        # Maintain score order
        filtered_scores = []
        final_ids = []
        for rid, score in zip(recipe_ids, scores):
            if rid in filtered_ids:
                final_ids.append(rid)
                filtered_scores.append(score)
        
        return final_ids, filtered_scores
    
    def _apply_mmr_diversity(
        self,
        recipe_ids: List[int],
        scores: List[float],
        top_k: int,
        diversity_lambda: float = 0.3
    ) -> Tuple[List[int], List[float]]:
        """
        Apply Maximal Marginal Relevance for diversity.
        
        Implements greedy MMR selection balancing relevance and diversity.
        
        Args:
            recipe_ids: Candidate recipe IDs
            scores: Relevance scores
            top_k: Number of diverse recommendations to select
            diversity_lambda: Diversity weight (0=only relevance, 1=only diversity)
        
        Returns:
            Tuple of (diversified_recipe_ids, diversified_scores)
        """
        if len(recipe_ids) <= top_k:
            py_recipe_ids = [int(rid) if hasattr(rid, 'item') or type(rid).__module__ == 'numpy' else rid for rid in recipe_ids[:top_k]]
            py_scores = [float(s) if hasattr(s, 'item') or type(s).__module__ == 'numpy' else s for s in scores[:top_k]]
            return py_recipe_ids, py_scores
        
        # Get recipe embeddings for diversity calculation
        recipe_embeddings = {}
        
        if self.model_loader.recipe_embeddings is not None and self.model_loader.recipe_ids_tensor is not None:
            # Use precomputed embeddings
            import torch
            recipe_ids_np = self.model_loader.recipe_ids_tensor.cpu().numpy()
            embeddings_np = self.model_loader.recipe_embeddings.cpu().numpy()
            
            if self.model_loader.recipe_id_mapping is not None:
                for rid in recipe_ids:
                    if rid in self.model_loader.recipe_id_mapping:
                        internal_id = self.model_loader.recipe_id_mapping[rid]
                        # Find in tensor
                        matches = np.where(recipe_ids_np == internal_id)[0]
                        if len(matches) > 0:
                            recipe_embeddings[rid] = embeddings_np[matches[0]]
        
        if not recipe_embeddings:
            logger.warning("No embeddings available for MMR, skipping diversity")
            py_recipe_ids = [int(rid) if hasattr(rid, 'item') or type(rid).__module__ == 'numpy' else rid for rid in recipe_ids[:top_k]]
            py_scores = [float(s) if hasattr(s, 'item') or type(s).__module__ == 'numpy' else s for s in scores[:top_k]]
            return py_recipe_ids, py_scores
        
        # MMR algorithm
        selected_ids = []
        selected_scores = []
        remaining = list(zip(recipe_ids, scores))
        score_dict = dict(zip(recipe_ids, scores))
        
        # Normalize scores
        max_score = max(scores) if scores else 1.0
        min_score = min(scores) if scores else 0.0
        score_range = max_score - min_score if max_score > min_score else 1.0
        
        # Select first item (highest relevance)
        if remaining:
            first_id, first_score = remaining.pop(0)
            selected_ids.append(first_id)
            selected_scores.append(first_score)
        
        # Iteratively select diverse items
        while len(selected_ids) < top_k and remaining:
            best_mmr = -float('inf')
            best_idx = 0
            
            for idx, (candidate_id, _) in enumerate(remaining):
                # Relevance score (normalized)
                relevance = (score_dict[candidate_id] - min_score) / score_range
                
                # Diversity score (minimum similarity to selected items)
                if candidate_id in recipe_embeddings:
                    candidate_emb = recipe_embeddings[candidate_id]
                    
                    max_similarity = 0.0
                    for selected_id in selected_ids:
                        if selected_id in recipe_embeddings:
                            selected_emb = recipe_embeddings[selected_id]
                            # Cosine similarity
                            sim = np.dot(candidate_emb, selected_emb) / (
                                np.linalg.norm(candidate_emb) * np.linalg.norm(selected_emb) + 1e-8
                            )
                            max_similarity = max(max_similarity, sim)
                    
                    diversity = 1.0 - max_similarity
                else:
                    diversity = 1.0
                
                # MMR score: (1-lambda)*relevance + lambda*diversity
                mmr = (1 - diversity_lambda) * relevance + diversity_lambda * diversity
                
                if mmr > best_mmr:
                    best_mmr = mmr
                    best_idx = idx
            
            # Add best item
            selected_id, selected_score = remaining.pop(best_idx)
            selected_ids.append(selected_id)
            selected_scores.append(selected_score)
        
        # Calculate and log diversity metric
        if len(selected_ids) > 1:
            diversity_score = self._calculate_diversity_score(selected_ids, recipe_embeddings)
            metrics.recommendation_diversity.labels(model="mmr").observe(diversity_score)
        
        return selected_ids, selected_scores
    
    def _calculate_diversity_score(
        self,
        recipe_ids: List[int],
        recipe_embeddings: Dict[int, np.ndarray]
    ) -> float:
        """Calculate average pairwise dissimilarity."""
        if len(recipe_ids) <= 1:
            return 1.0
        
        similarities = []
        for i in range(len(recipe_ids)):
            for j in range(i + 1, len(recipe_ids)):
                rid_i, rid_j = recipe_ids[i], recipe_ids[j]
                if rid_i in recipe_embeddings and rid_j in recipe_embeddings:
                    emb_i = recipe_embeddings[rid_i]
                    emb_j = recipe_embeddings[rid_j]
                    sim = np.dot(emb_i, emb_j) / (
                        np.linalg.norm(emb_i) * np.linalg.norm(emb_j) + 1e-8
                    )
                    similarities.append(sim)
        
        if similarities:
            return float(1.0 - np.mean(similarities))
        return 1.0
    
    

    JAVA_BACKEND_URL = "http://localhost:8080/api/v1/recipes/find/"  # Update host/port if needed

    def fetch_recipe_details(self, recipe_id: int):
        # Only use local recipes_df for details (fast, reliable)
        model_loader = get_model_loader()
        meta = model_loader.get_recipe_metadata(recipe_id)
        if meta:
            self._recipe_cache[recipe_id] = meta
            return meta
        return None

    def _build_recommendations(
        self,
        recipe_ids: List[int],
        scores: List[float],
        model_used: str
    ) -> List[RecipeRecommendation]:
        """Build RecipeRecommendation objects with full metadata from PostgreSQL."""
        batch_meta = self.fetch_recipes_from_db(recipe_ids)
        recommendations = []
        for recipe_id, score in zip(recipe_ids, scores):
            # Convert numpy types to native Python types
            py_recipe_id = int(recipe_id) if hasattr(recipe_id, 'item') or type(recipe_id).__module__ == 'numpy' else recipe_id
            py_score = float(score) if hasattr(score, 'item') or type(score).__module__ == 'numpy' else score
            recipe_data = batch_meta.get(py_recipe_id)
            # Only add recipes that exist in the database and have a real image
            if recipe_data and not str(recipe_data.get("image", "")).startswith("https://placehold.co"):
                logger.info(f"Recipe ID {py_recipe_id}: full recipe_data from DB = {recipe_data}")
                raw_chef = recipe_data.get("chef")
                chef = raw_chef or "Unknown"
                likes = recipe_data.get("like_count") if recipe_data.get("like_count") is not None else 0
                comments = recipe_data.get("comments") if recipe_data.get("comments") is not None else 0
                rec = RecipeRecommendation(
                    recipe_id=py_recipe_id,
                    title=recipe_data.get("title", f"Recipe {py_recipe_id}"),
                    score=py_score,
                    reason=f"Personalized by {model_used} model",
                    cuisine=recipe_data.get("cuisine"),
                    dietary_type=recipe_data.get("dietary_type"),
                    cook_time=recipe_data.get("cook_time"),
                    difficulty=recipe_data.get("difficulty"),
                    calories_per_serving=recipe_data.get("calories_per_serving"),
                    avg_rating=recipe_data.get("avg_rating"),
                    chef=chef,
                    likes=likes,
                    comments=comments
                )
                recommendations.append(rec)
        return recommendations
    
    async def get_batch_recommendations(
        self,
        user_ids: List[int],
        top_k: int = 10,
        apply_diversity: bool = True
    ) -> Dict[int, Tuple[List[RecipeRecommendation], str, float]]:
        """
        Get recommendations for multiple users (batch inference).
        
        Args:
            user_ids: List of user IDs
            top_k: Number of recommendations per user
            apply_diversity: Apply diversity
        
        Returns:
            Dictionary mapping user_id to (recommendations, model_used, latency_ms)
        """
        results = {}
        
        # TODO: Implement true batch inference for Two-Tower model
        # For now, process sequentially (can be parallelized with asyncio.gather)
        
        for user_id in user_ids:
            try:
                recs, model, cached, latency = await self.get_recommendations(
                    user_id, top_k, apply_diversity=apply_diversity
                )
                results[user_id] = (recs, model, latency)
            except Exception as e:
                logger.error(f"Batch recommendation failed for user {user_id}: {e}")
                results[user_id] = ([], "error", 0.0)
        
        return results
    
    async def get_cold_start_recommendations(
        self,
        preferences: UserPreferences,
        top_k: int = 10,
        exclude_recipe_ids: Optional[List[int]] = None
    ) -> Tuple[List[RecipeRecommendation], float]:
        """
        Get recommendations for new users without history (cold-start).
        
        Uses content-based filtering on preferences.
        
        Args:
            preferences: User preferences
            top_k: Number of recommendations
            exclude_recipe_ids: Recipe IDs to exclude
        
        Returns:
            Tuple of (recommendations, latency_ms)
        """
        start_time = time.time()
        exclude_recipe_ids = exclude_recipe_ids or []
        
        # Build filters from preferences
        filters_dict = {}
        
        if preferences.dietary_preferences:
            # For now, use first preference
            # TODO: Support multiple dietary preferences
            filters_dict['dietary_type'] = preferences.dietary_preferences[0]
        
        if preferences.cuisine_preferences:
            filters_dict['cuisine'] = preferences.cuisine_preferences[0]
        
        if preferences.max_cook_time:
            filters_dict['max_cook_time'] = preferences.max_cook_time
        
        if preferences.difficulty_preference:
            filters_dict['difficulty'] = preferences.difficulty_preference
        
        # Get popular recipes matching preferences
        popular_ids, popular_scores = self.model_loader.get_popular_recipes(
            top_k * 3, exclude_recipe_ids
        )
        
        # Apply filters
        if filters_dict and self.feature_service:
            popular_ids = self.feature_service.filter_recipes_by_criteria(popular_ids, filters_dict)
        
        # Take top-k
        final_ids = popular_ids[:top_k]
        final_scores = popular_scores[:len(final_ids)]
        
        # Build recommendations
        recommendations = self._build_recommendations(final_ids, final_scores, "cold_start")
        
        latency_ms = (time.time() - start_time) * 1000
        logger.info(f"Cold-start recommendations generated: {len(recommendations)}")
        
        return recommendations, latency_ms
    
    async def get_similar_users(
        self,
        user_id: int,
        top_k: int = 10
    ) -> Tuple[List[Dict[str, Any]], str, float]:
        """
        Find similar users based on user embeddings from Two-Tower model.
        
        Uses cosine similarity between user embeddings.
        
        Args:
            user_id: User ID to find similar users for
            top_k: Number of similar users to return
        
        Returns:
            Tuple of (similar_users_list, model_used, latency_ms)
            Each similar user is: {"user_id": int, "similarity_score": float}
        """
        start_time = time.time()
        
        # Check cache first
        cache_key = self.cache_service.get_cache_key(
            "similar_users",
            user_id=user_id,
            top_k=top_k
        )
        
        cached_result = await self.cache_service.get(cache_key)
        if cached_result:
            latency_ms = (time.time() - start_time) * 1000
            logger.info(f"Cache hit for similar users {user_id}", extra={"latency_ms": latency_ms})
            metrics.cache_hit_count.labels(cache_type="similar_users").inc()
            return cached_result['similar_users'], cached_result['model_used'], latency_ms
        
        metrics.cache_miss_count.labels(cache_type="similar_users").inc()
        
        # Try Two-Tower model first
        if self.model_loader.two_tower_model is not None:
            try:
                similar_users = self._find_similar_users_two_tower(user_id, top_k)
                model_used = "two_tower"
                
                # Cache results
                await self.cache_service.set(
                    cache_key,
                    {
                        'similar_users': similar_users,
                        'model_used': model_used
                    }
                )
                
                latency_ms = (time.time() - start_time) * 1000
                logger.info(
                    f"Found {len(similar_users)} similar users for user {user_id}",
                    extra={"model": model_used, "latency_ms": latency_ms}
                )
                
                return similar_users, model_used, latency_ms
                
            except ValueError as e:
                logger.warning(f"Two-Tower similarity failed for user {user_id}: {e}")
                raise
            except Exception as e:
                logger.error(f"Two-Tower similarity error for user {user_id}: {e}")
                raise
        
        # Fallback to ALS if Two-Tower not available
        if self.model_loader.als_user_factors is not None:
            try:
                similar_users = self._find_similar_users_als(user_id, top_k)
                model_used = "als"
                
                # Cache results
                await self.cache_service.set(
                    cache_key,
                    {
                        'similar_users': similar_users,
                        'model_used': model_used
                    }
                )
                
                latency_ms = (time.time() - start_time) * 1000
                logger.info(
                    f"Found {len(similar_users)} similar users for user {user_id} using ALS",
                    extra={"model": model_used, "latency_ms": latency_ms}
                )
                
                return similar_users, model_used, latency_ms
                
            except Exception as e:
                logger.error(f"ALS similarity error for user {user_id}: {e}")
                raise ValueError(f"No model available for user similarity")
        
        raise ValueError("No model available for user similarity")
    
    def _find_similar_users_two_tower(
        self,
        user_id: int,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Find similar users using Two-Tower user embeddings.
        
        Args:
            user_id: Query user ID
            top_k: Number of similar users
        
        Returns:
            List of {"user_id": int, "similarity_score": float}
        """
        import torch
        
        # Check if user exists in mappings
        if self.model_loader.user_id_mapping is None or user_id not in self.model_loader.user_id_mapping:
            raise ValueError(f"User ID {user_id} not found in mappings")

        user_internal_id = self.model_loader.user_id_mapping[user_id]
        
        # Get user features
        if not self.feature_service:
            raise ValueError("FeatureService not initialized")
        
        user_features = self.feature_service.get_user_features(user_id)
        
        # Compute query user embedding
        user_id_tensor = torch.tensor([user_internal_id], dtype=torch.long, device=self.model_loader.device)
        user_features_tensor = torch.tensor([user_features], dtype=torch.float32, device=self.model_loader.device)
        
        if self.model_loader.two_tower_model is None:
            raise ValueError("Two-Tower model is not available")
        with torch.no_grad():
            query_embedding = self.model_loader.two_tower_model.get_user_embedding(
                user_id_tensor, user_features_tensor
            )
            query_embedding = query_embedding[0]  # Shape: [embedding_dim]
        
        # Compute embeddings for all users (or use precomputed if available)
        if self.model_loader.user_id_mapping is None:
            raise ValueError("User ID mapping is not available")
        all_user_ids = list(self.model_loader.user_id_mapping.keys())
        all_user_internal_ids = [self.model_loader.user_id_mapping[uid] for uid in all_user_ids]
        
        # Batch compute user embeddings
        batch_size = 256
        all_embeddings = []
        
        for i in range(0, len(all_user_ids), batch_size):
            batch_user_ids = all_user_ids[i:i + batch_size]
            batch_internal_ids = all_user_internal_ids[i:i + batch_size]
            
            # Get features for batch
            batch_features = []
            for uid in batch_user_ids:
                features = self.feature_service.get_user_features(uid)
                batch_features.append(features)
            
            # Compute embeddings
            batch_ids_tensor = torch.tensor(batch_internal_ids, dtype=torch.long, device=self.model_loader.device)
            batch_features_tensor = torch.tensor(batch_features, dtype=torch.float32, device=self.model_loader.device)
            
            if self.model_loader.two_tower_model is None:
                raise ValueError("Two-Tower model is not available for batch embedding computation")
            with torch.no_grad():
                batch_embeddings = self.model_loader.two_tower_model.get_user_embedding(
                    batch_ids_tensor, batch_features_tensor
                )
                all_embeddings.append(batch_embeddings)
        
        # Concatenate all embeddings
        all_embeddings_tensor = torch.cat(all_embeddings, dim=0)  # Shape: [n_users, embedding_dim]
        
        # Compute cosine similarity
        query_norm = torch.norm(query_embedding)
        all_norms = torch.norm(all_embeddings_tensor, dim=1)
        
        similarities = torch.matmul(all_embeddings_tensor, query_embedding) / (all_norms * query_norm + 1e-8)
        
        # Get top-k similar users (excluding the query user)
        top_k_plus_one = min(top_k + 1, len(all_user_ids))
        top_similarities, top_indices = torch.topk(similarities, top_k_plus_one)
        
        # Build result list
        similar_users = []
        for similarity, idx in zip(top_similarities.cpu().numpy(), top_indices.cpu().numpy()):
            similar_user_id = all_user_ids[idx]
            
            # Skip the query user itself
            if similar_user_id == user_id:
                continue
            
            similar_users.append({
                "user_id": int(similar_user_id),
                "similarity_score": float(similarity)
            })
            
            if len(similar_users) >= top_k:
                break
        
        return similar_users
    
    def _find_similar_users_als(
        self,
        user_id: int,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Find similar users using ALS user factors.
        
        Args:
            user_id: Query user ID
            top_k: Number of similar users
        
        Returns:
            List of {"user_id": int, "similarity_score": float}
        """
        # Check if user exists in ALS mappings
        if self.model_loader.user_id_mapping is None or user_id not in self.model_loader.user_id_mapping:
            raise ValueError(f"User ID {user_id} not found in ALS mappings")

        user_internal_id = self.model_loader.user_id_mapping[user_id]
        
        # Check if internal ID is valid
        if self.model_loader.als_user_factors is None:
            raise ValueError("ALS user factors are not available")
        if user_internal_id >= len(self.model_loader.als_user_factors):
            raise ValueError(f"User internal ID {user_internal_id} out of range")

        # Get user factor
        query_factor = self.model_loader.als_user_factors[user_internal_id]

        # Compute cosine similarity with all users
        query_norm = np.linalg.norm(query_factor)
        all_norms = np.linalg.norm(self.model_loader.als_user_factors, axis=1)

        similarities = np.dot(self.model_loader.als_user_factors, query_factor) / (all_norms * query_norm + 1e-8)
        
        # Get top-k similar users (excluding the query user)
        top_k_plus_one = min(top_k + 1, len(similarities))
        top_indices = np.argsort(similarities)[-top_k_plus_one:][::-1]
        
        # Build result list
        similar_users = []
        if self.model_loader.user_id_mapping is None:
            raise ValueError("User ID mapping is not available")
        reverse_user_mapping = {v: k for k, v in self.model_loader.user_id_mapping.items()}
        
        for idx in top_indices:
            if idx in reverse_user_mapping:
                similar_user_id = reverse_user_mapping[idx]
                
                # Skip the query user itself
                if similar_user_id == user_id:
                    continue
                
                similar_users.append({
                    "user_id": int(similar_user_id),
                    "similarity_score": float(similarities[idx])
                })
                
                if len(similar_users) >= top_k:
                    break
        
        return similar_users
