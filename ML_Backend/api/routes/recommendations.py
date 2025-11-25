"""
Recommendation endpoints for recipe and user similarity recommendations.
Implements batch processing, cold-start, and personalized recommendations.
"""
import time
from typing import List
from fastapi import APIRouter, HTTPException, status
from api.schemas.request import (
    RecipeRecommendationRequest,
    RecipeSimilarityRequest,
    UserSimilarityRequest,
    BatchRecommendationRequest,
    ColdStartRequest
)
from api.schemas.response import (
    RecipeRecommendationResponse,
    UserSimilarityResponse,
    BatchRecommendationResponse,
    UserRecommendations,
    ErrorResponse
)
from api.services.recommendation_service import get_recommendation_service
from api.utils.logger import get_logger
from api.utils.metrics import metrics
from api.config.settings import settings

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])
logger = get_logger(__name__)


@router.post("/recipes", response_model=RecipeRecommendationResponse)
async def get_recipe_recommendations(request: RecipeRecommendationRequest) -> RecipeRecommendationResponse:
    """
    Get personalized recipe recommendations for a user.
    
    Uses fallback strategy: Two-Tower → ALS → Popularity
    """
    recommendation_service = get_recommendation_service()
    start_time = time.time()
    
    try:
        # Validate request
        if request.top_k > settings.MAX_BATCH_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"top_k cannot exceed {settings.MAX_BATCH_SIZE}"
            )
        
        # Get recommendations
        recommendations, model_used, cached, latency_ms = await recommendation_service.get_recommendations(
            user_id=request.user_id,
            top_k=request.top_k,
            exclude_recipe_ids=request.exclude_recipe_ids,
            filters=request.filters,
            apply_diversity=request.apply_diversity,
            diversity_weight=request.diversity_weight
        )
        
        # Record metrics
        request_latency = (time.time() - start_time) * 1000
        metrics.request_duration.labels(
            endpoint="/api/recommendations/recipes",
            method="POST"
        ).observe(request_latency / 1000.0)
        
        metrics.request_count.labels(
            endpoint="/api/recommendations/recipes",
            method="POST",
            status="200"
        ).inc()
        
        return RecipeRecommendationResponse(
            user_id=request.user_id,
            recommendations=recommendations,
            model_used=model_used,
            cached=cached,
            latency_ms=latency_ms,
            total_candidates=len(recommendations)
        )
    
    except ValueError as e:
        # User not found or invalid input
        logger.warning(f"Validation error for user {request.user_id}: {e}")
        metrics.error_count.labels(
            error_type="validation_error",
            endpoint="/api/recommendations/recipes"
        ).inc()
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Recommendation error for user {request.user_id}: {e}")
        metrics.error_count.labels(
            error_type="internal_error",
            endpoint="/api/recommendations/recipes"
        ).inc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/users", response_model=UserSimilarityResponse)
async def get_similar_users(request: UserSimilarityRequest) -> UserSimilarityResponse:
    """
    Find similar users based on user embeddings from Two-Tower model or ALS factors.
    
    Uses cosine similarity to find users with similar preferences.
    """
    recommendation_service = get_recommendation_service()
    start_time = time.time()
    
    try:
        # Validate request
        if request.top_k > settings.MAX_BATCH_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"top_k cannot exceed {settings.MAX_BATCH_SIZE}"
            )
        
        # Get similar users
        similar_users_data, model_used, latency_ms = await recommendation_service.get_similar_users(
            user_id=request.user_id,
            top_k=request.top_k
        )
        
        # Convert to response format
        from api.schemas.response import UserSimilarity
        similar_users = [
            UserSimilarity(
                user_id=user['user_id'],
                similarity_score=user['similarity_score'],
                common_preferences=None  # Could be enhanced with preference analysis
            )
            for user in similar_users_data
        ]
        
        # Record metrics
        request_latency = (time.time() - start_time) * 1000
        metrics.request_duration.labels(
            endpoint="/api/recommendations/users",
            method="POST"
        ).observe(request_latency / 1000.0)
        
        metrics.request_count.labels(
            endpoint="/api/recommendations/users",
            method="POST",
            status="200"
        ).inc()
        
        return UserSimilarityResponse(
            user_id=request.user_id,
            similar_users=similar_users,
            model_used=model_used,
            latency_ms=latency_ms
        )
    
    except ValueError as e:
        # User not found or invalid input
        logger.warning(f"Validation error for user similarity {request.user_id}: {e}")
        metrics.error_count.labels(
            error_type="validation_error",
            endpoint="/api/recommendations/users"
        ).inc()
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"User similarity error for user {request.user_id}: {e}")
        metrics.error_count.labels(
            error_type="internal_error",
            endpoint="/api/recommendations/users"
        ).inc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/batch", response_model=BatchRecommendationResponse)
async def get_batch_recommendations(request: BatchRecommendationRequest) -> BatchRecommendationResponse:
    """
    Get recommendations for multiple users in batch.
    
    Optimized for batch inference with size limits.
    """
    recommendation_service = get_recommendation_service()
    start_time = time.time()
    
    try:
        # Validate batch size
        if len(request.user_ids) > settings.MAX_BATCH_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Batch size cannot exceed {settings.MAX_BATCH_SIZE}. Got {len(request.user_ids)}"
            )
        
        # Get batch recommendations
        batch_results = await recommendation_service.get_batch_recommendations(
            user_ids=request.user_ids,
            top_k=request.top_k,
            apply_diversity=request.apply_diversity
        )
        
        # Build response
        results = []
        successful = 0
        failed = 0
        
        for user_id in request.user_ids:
            if user_id in batch_results:
                recs, model, _ = batch_results[user_id]
                if recs:
                    results.append(UserRecommendations(
                        user_id=user_id,
                        recommendations=recs,
                        error=None
                    ))
                    successful += 1
                else:
                    results.append(UserRecommendations(
                        user_id=user_id,
                        recommendations=[],
                        error="No recommendations generated"
                    ))
                    failed += 1
                model_used = model
            else:
                results.append(UserRecommendations(
                    user_id=user_id,
                    recommendations=[],
                    error="User not processed"
                ))
                failed += 1
                model_used = "none"
        
        total_latency = (time.time() - start_time) * 1000
        
        metrics.request_duration.labels(
            endpoint="/api/recommendations/batch",
            method="POST"
        ).observe(total_latency / 1000.0)
        
        return BatchRecommendationResponse(
            results=results,
            model_used=model_used,
            total_users=len(request.user_ids),
            successful_count=successful,
            failed_count=failed,
            latency_ms=total_latency
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Batch recommendation error: {e}")
        metrics.error_count.labels(
            error_type="internal_error",
            endpoint="/api/recommendations/batch"
        ).inc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/cold-start", response_model=RecipeRecommendationResponse)
async def get_cold_start_recommendations(request: ColdStartRequest) -> RecipeRecommendationResponse:
    """
    Get recommendations for new users without interaction history.
    
    Uses content-based filtering on user preferences.
    """
    recommendation_service = get_recommendation_service()
    start_time = time.time()
    
    try:
        # Validate request
        if request.top_k > settings.MAX_BATCH_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"top_k cannot exceed {settings.MAX_BATCH_SIZE}"
            )
        
        # Get cold-start recommendations
        recommendations, latency_ms = await recommendation_service.get_cold_start_recommendations(
            preferences=request.preferences,
            top_k=request.top_k,
            exclude_recipe_ids=request.exclude_recipe_ids
        )
        
        # Record metrics
        request_latency = (time.time() - start_time) * 1000
        metrics.request_duration.labels(
            endpoint="/api/recommendations/cold-start",
            method="POST"
        ).observe(request_latency / 1000.0)
        
        return RecipeRecommendationResponse(
            user_id=0,  # No user ID for cold start
            recommendations=recommendations,
            model_used="cold_start",
            cached=False,
            latency_ms=latency_ms,
            total_candidates=len(recommendations)
        )
    
    except Exception as e:
        logger.error(f"Cold-start recommendation error: {e}")
        metrics.error_count.labels(
            error_type="internal_error",
            endpoint="/api/recommendations/cold-start"
        ).inc()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/recipes/similar", response_model=RecipeRecommendationResponse)
async def get_similar_recipes(request: RecipeSimilarityRequest) -> RecipeRecommendationResponse:
    """
    Find recipes similar to a given recipe id using recipe embeddings.
    """
    recommendation_service = get_recommendation_service()
    start_time = time.time()
    try:
        recommendations, model_used, latency_ms = await recommendation_service.get_similar_recipes(
            recipe_id=request.recipe_id,
            top_k=request.top_k
        )

        return RecipeRecommendationResponse(
            user_id=0,
            recommendations=recommendations,
            model_used=model_used,
            cached=False,
            latency_ms=latency_ms,
            total_candidates=len(recommendations)
        )

    except ValueError as e:
        logger.warning(f"Recipe similarity validation error for {request.recipe_id}: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Recipe similarity error for {request.recipe_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
