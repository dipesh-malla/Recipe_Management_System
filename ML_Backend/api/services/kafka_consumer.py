"""
Kafka consumer for listening to interaction events and invalidating cache.
Runs in background thread to process events asynchronously.
"""
import json
import threading
from typing import Optional
from kafka import KafkaConsumer
from kafka.errors import KafkaError

from api.config.settings import settings
from api.services.cache_service import get_cache_service
from api.utils.logger import get_logger

logger = get_logger(__name__)


class KafkaConsumerService:
    """Kafka consumer for interaction events."""
    
    def __init__(self):
        """Initialize Kafka consumer service."""
        self.consumer: Optional[KafkaConsumer] = None
        self.enabled = settings.KAFKA_ENABLED
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.cache_service = get_cache_service()
        self._connected = False
    
    def start(self) -> None:
        """Start Kafka consumer in background thread."""
        if not self.enabled:
            logger.info("Kafka disabled, skipping consumer")
            return
        
        if self.running:
            logger.warning("Kafka consumer already running")
            return
        
        try:
            # Create Kafka consumer
            self.consumer = KafkaConsumer(
                settings.KAFKA_INTERACTIONS_TOPIC,
                bootstrap_servers=settings.get_kafka_servers(),
                auto_offset_reset=settings.KAFKA_AUTO_OFFSET_RESET,
                group_id=settings.KAFKA_CONSUMER_GROUP,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None,
                enable_auto_commit=True,
                consumer_timeout_ms=1000  # Allow periodic checking of running flag
            )
            
            self._connected = True
            self.running = True
            
            # Start consumer thread
            self.thread = threading.Thread(target=self._consume_loop, daemon=True)
            self.thread.start()
            
            logger.info(f"✅ Kafka consumer started for topic: {settings.KAFKA_INTERACTIONS_TOPIC}")
            
        except KafkaError as e:
            logger.error(f"Failed to start Kafka consumer: {e}")
            self._connected = False
            # Non-fatal: application can run without Kafka
    
    def stop(self) -> None:
        """Stop Kafka consumer."""
        if not self.running:
            return
        
        logger.info("Stopping Kafka consumer...")
        self.running = False
        
        if self.thread:
            self.thread.join(timeout=5)
        
        if self.consumer:
            self.consumer.close()
        
        self._connected = False
        logger.info("Kafka consumer stopped")
    
    def is_connected(self) -> bool:
        """Check if connected to Kafka."""
        return self._connected
    
    def _consume_loop(self) -> None:
        """Main consumer loop (runs in background thread)."""
        logger.info("Kafka consumer loop started")
        
        while self.running:
            try:
                # Poll for messages
                for message in self.consumer:
                    if not self.running:
                        break
                    
                    try:
                        self._process_message(message.value)
                    except Exception as e:
                        logger.error(f"Error processing Kafka message: {e}")
                        # Continue processing other messages
            
            except Exception as e:
                if self.running:
                    logger.error(f"Kafka consumer error: {e}")
                    # Brief pause before retry
                    import time
                    time.sleep(1)
        
        logger.info("Kafka consumer loop exited")
    
    def _process_message(self, message: dict) -> None:
        """
        Process interaction event message.
        
        Expected message format:
        {
            "user_id": 123,
            "recipe_id": 456,
            "interaction_type": "view|like|save|comment",
            "timestamp": "2025-10-20T12:00:00Z"
        }
        """
        if not message:
            return
        
        user_id = message.get('user_id')
        recipe_id = message.get('recipe_id')
        interaction_type = message.get('interaction_type')
        
        logger.info(
            f"Received interaction event",
            extra={
                "user_id": user_id,
                "recipe_id": recipe_id,
                "type": interaction_type
            }
        )
        
        # Invalidate cache for user
        if user_id:
            # Run cache invalidation in event loop
            # Since we're in a thread, we need to handle async carefully
            import asyncio
            try:
                # Try to get event loop, create if needed
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            if loop.is_running():
                # Schedule coroutine
                asyncio.create_task(self._async_invalidate_cache(user_id, recipe_id))
            else:
                # Run synchronously
                loop.run_until_complete(self._async_invalidate_cache(user_id, recipe_id))
        
        # TODO: Optionally trigger incremental model update
        # For now, we just invalidate cache. Full retraining happens offline.
    
    async def _async_invalidate_cache(self, user_id: int, recipe_id: Optional[int] = None) -> None:
        """Invalidate cache entries asynchronously."""
        try:
            # Invalidate user recommendations
            deleted_user = await self.cache_service.invalidate_user(user_id)
            logger.info(f"Invalidated {deleted_user} cache entries for user {user_id}")
            
            # Optionally invalidate recipe-related caches
            if recipe_id:
                deleted_recipe = await self.cache_service.invalidate_recipe(recipe_id)
                logger.info(f"Invalidated {deleted_recipe} cache entries for recipe {recipe_id}")
        
        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")


# Singleton instance
_kafka_consumer_instance: Optional[KafkaConsumerService] = None


def get_kafka_consumer() -> KafkaConsumerService:
    """Get the singleton KafkaConsumerService instance."""
    global _kafka_consumer_instance
    if _kafka_consumer_instance is None:
        _kafka_consumer_instance = KafkaConsumerService()
    return _kafka_consumer_instance
