"""
Data synchronization endpoints for updating cached user/recipe/interaction data.
"""
from fastapi import APIRouter, HTTPException, status
from api.schemas.request import SyncUsersRequest, SyncRecipesRequest, SyncInteractionsRequest
from api.schemas.response import SyncResponse
from api.services.cache_service import get_cache_service
from api.utils.logger import get_logger

router = APIRouter(prefix="/api/sync", tags=["sync"])
logger = get_logger(__name__)


@router.post("/users", response_model=SyncResponse)
async def sync_users(request: SyncUsersRequest) -> SyncResponse:
    """
    Sync user data and invalidate affected cache entries.
    
    This endpoint accepts updated user data from the Java backend
    and invalidates relevant cache entries.
    """
    cache_service = get_cache_service()
    
    try:
        processed = 0
        failed = 0
        errors = []
        
        for user_data in request.users:
            try:
                user_id = user_data.get('user_id') or user_data.get('id')
                if user_id:
                    # Invalidate user cache
                    await cache_service.invalidate_user(user_id)
                    processed += 1
                else:
                    failed += 1
                    errors.append("User data missing user_id")
            
            except Exception as e:
                failed += 1
                errors.append(f"Error processing user: {str(e)}")
                logger.error(f"User sync error: {e}")
        
        return SyncResponse(
            success=failed == 0,
            items_processed=processed,
            items_failed=failed,
            message=f"Synced {processed} users, {failed} failed",
            errors=errors if errors else None
        )
    
    except Exception as e:
        logger.error(f"User sync endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/recipes", response_model=SyncResponse)
async def sync_recipes(request: SyncRecipesRequest) -> SyncResponse:
    """
    Sync recipe data and invalidate affected cache entries.
    
    This endpoint accepts updated recipe data from the Java backend
    and invalidates relevant cache entries.
    """
    cache_service = get_cache_service()
    
    try:
        processed = 0
        failed = 0
        errors = []
        
        for recipe_data in request.recipes:
            try:
                recipe_id = recipe_data.get('recipe_id') or recipe_data.get('id')
                if recipe_id:
                    # Invalidate recipe cache (affects all recommendations)
                    await cache_service.invalidate_recipe(recipe_id)
                    processed += 1
                else:
                    failed += 1
                    errors.append("Recipe data missing recipe_id")
            
            except Exception as e:
                failed += 1
                errors.append(f"Error processing recipe: {str(e)}")
                logger.error(f"Recipe sync error: {e}")
        
        return SyncResponse(
            success=failed == 0,
            items_processed=processed,
            items_failed=failed,
            message=f"Synced {processed} recipes, {failed} failed",
            errors=errors if errors else None
        )
    
    except Exception as e:
        logger.error(f"Recipe sync endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/interactions", response_model=SyncResponse)
async def sync_interactions(request: SyncInteractionsRequest) -> SyncResponse:
    """
    Sync interaction data and invalidate affected cache entries.
    
    This endpoint accepts new interaction data and invalidates
    cache for affected users.
    
    Note: For real-time updates, prefer using Kafka topic instead.
    """
    cache_service = get_cache_service()
    
    try:
        processed = 0
        failed = 0
        errors = []
        affected_users = set()
        
        for interaction_data in request.interactions:
            try:
                user_id = interaction_data.get('user_id')
                if user_id:
                    affected_users.add(user_id)
                    processed += 1
                else:
                    failed += 1
                    errors.append("Interaction data missing user_id")
            
            except Exception as e:
                failed += 1
                errors.append(f"Error processing interaction: {str(e)}")
                logger.error(f"Interaction sync error: {e}")
        
        # Invalidate cache for affected users
        for user_id in affected_users:
            await cache_service.invalidate_user(user_id)
        
        logger.info(f"Invalidated cache for {len(affected_users)} users")
        
        return SyncResponse(
            success=failed == 0,
            items_processed=processed,
            items_failed=failed,
            message=f"Synced {processed} interactions, invalidated cache for {len(affected_users)} users",
            errors=errors if errors else None
        )
    
    except Exception as e:
        logger.error(f"Interaction sync endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
