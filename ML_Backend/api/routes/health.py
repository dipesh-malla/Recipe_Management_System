"""
Health check and metrics endpoints.
"""
import time
from fastapi import APIRouter, Response
from api.schemas.response import HealthResponse
from api.config.settings import settings
from api.models.model_loader import get_model_loader
from api.services.cache_service import get_cache_service
from api.services.kafka_consumer import get_kafka_consumer
from api.utils.metrics import metrics

router = APIRouter(prefix="/api", tags=["health"])

# Track application start time
app_start_time = time.time()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    Returns application health status and component connectivity.
    """
    model_loader = get_model_loader()
    cache_service = get_cache_service()
    kafka_consumer = get_kafka_consumer()
    
    models_loaded = model_loader.is_loaded()
    cache_connected = cache_service.is_connected()
    kafka_connected = kafka_consumer.is_connected()
    
    # Determine overall status
    if models_loaded and cache_connected and kafka_connected:
        status = "healthy"
    elif models_loaded:
        status = "degraded"  # Core functionality works but some services down
    else:
        status = "unhealthy"  # Models not loaded
    
    uptime_seconds = time.time() - app_start_time
    model_status = model_loader.get_status()
    
    return HealthResponse(
        status=status,
        models_loaded=models_loaded,
        cache_connected=cache_connected,
        kafka_connected=kafka_connected,
        uptime_seconds=uptime_seconds,
        version=settings.APP_VERSION,
        models=model_status
    )


@router.get("/metrics")
async def prometheus_metrics() -> Response:
    """
    Prometheus metrics endpoint.
    Returns metrics in Prometheus text format.
    """
    metrics_data = metrics.export()
    return Response(content=metrics_data, media_type="text/plain")
