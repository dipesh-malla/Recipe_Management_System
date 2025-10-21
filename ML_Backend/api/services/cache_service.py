"""
Redis cache service for caching recommendations and intermediate results.
Async Redis client with TTL support and cache invalidation.
"""
import json
from typing import Optional, Any, List
import redis.asyncio as redis
from api.config.settings import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


class CacheService:
    """Async Redis cache service."""
    
    def __init__(self):
        """Initialize cache service."""
        self.redis_client: Optional[redis.Redis] = None
        self.enabled = settings.CACHE_ENABLED
        self._connected = False
    
    async def connect(self) -> None:
        """Connect to Redis."""
        if not self.enabled:
            logger.info("Cache disabled, skipping Redis connection")
            return
        
        try:
            self.redis_client = await redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=settings.REDIS_DECODE_RESPONSES,
                max_connections=settings.REDIS_MAX_CONNECTIONS
            )
            
            # Test connection
            await self.redis_client.ping()
            self._connected = True
            logger.info("✅ Connected to Redis cache")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self._connected = False
            # Non-fatal: application can run without cache
    
    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.redis_client:
            await self.redis_client.close()
            self._connected = False
            logger.info("Disconnected from Redis")
    
    def is_connected(self) -> bool:
        """Check if connected to Redis."""
        return self._connected
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None if not found
        """
        if not self._connected or not self.redis_client:
            return None
        
        try:
            value = await self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning(f"Cache get failed for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache with optional TTL.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (default: settings.CACHE_TTL)
        
        Returns:
            True if successful, False otherwise
        """
        if not self._connected or not self.redis_client:
            return False
        
        try:
            ttl = ttl or settings.CACHE_TTL
            serialized = json.dumps(value)
            await self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key
        
        Returns:
            True if successful, False otherwise
        """
        if not self._connected or not self.redis_client:
            return False
        
        try:
            await self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete failed for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.
        
        Args:
            pattern: Key pattern (e.g., "recommendations:user:*")
        
        Returns:
            Number of keys deleted
        """
        if not self._connected or not self.redis_client:
            return 0
        
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                await self.redis_client.delete(*keys)
                logger.info(f"Deleted {len(keys)} keys matching pattern: {pattern}")
                return len(keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache delete pattern failed for {pattern}: {e}")
            return 0
    
    async def invalidate_user(self, user_id: int) -> int:
        """
        Invalidate all cache entries for a user.
        
        Args:
            user_id: User ID
        
        Returns:
            Number of keys deleted
        """
        pattern = f"recommendations:user:{user_id}:*"
        return await self.delete_pattern(pattern)
    
    async def invalidate_recipe(self, recipe_id: int) -> int:
        """
        Invalidate cache entries affected by recipe update.
        
        Args:
            recipe_id: Recipe ID
        
        Returns:
            Number of keys deleted
        """
        # For now, invalidate all recommendations (conservative approach)
        # TODO: Implement more granular invalidation
        pattern = "recommendations:*"
        return await self.delete_pattern(pattern)
    
    def get_cache_key(self, prefix: str, **kwargs) -> str:
        """
        Generate cache key from prefix and parameters.
        
        Args:
            prefix: Key prefix
            **kwargs: Key-value pairs to include in key
        
        Returns:
            Cache key string
        """
        parts = [prefix]
        for key, value in sorted(kwargs.items()):
            if isinstance(value, (list, dict)):
                # Hash complex types
                import hashlib
                value_str = json.dumps(value, sort_keys=True)
                value_hash = hashlib.md5(value_str.encode()).hexdigest()[:8]
                parts.append(f"{key}:{value_hash}")
            else:
                parts.append(f"{key}:{value}")
        return ":".join(parts)


# Singleton instance
_cache_service_instance: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """Get the singleton CacheService instance."""
    global _cache_service_instance
    if _cache_service_instance is None:
        _cache_service_instance = CacheService()
    return _cache_service_instance
