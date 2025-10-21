"""
Main FastAPI application for ML Backend.
Handles startup/shutdown events, route mounting, and middleware configuration.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import time

from api.config.settings import settings
from api.models.model_loader import get_model_loader
from api.services.cache_service import get_cache_service
from api.services.kafka_consumer import get_kafka_consumer
from api.services.recommendation_service import RecommendationService
from api.routes import recommendations_router, health_router, sync_router
from api.utils.logger import get_logger, configure_logging
from api.utils.metrics import metrics

# Configure logging
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    try:
        # Load ML models
        logger.info("Loading ML models...")
        model_loader = get_model_loader()
        model_loader.load_models()
        
        # Update model loaded metrics
        model_status = model_loader.get_status()
        for model_name, loaded in model_status.items():
            metrics.model_loaded.labels(model=model_name).set(1 if loaded else 0)
        
        logger.info("✅ Models loaded successfully")
        
        # Initialize recommendation service
        recommendation_service = RecommendationService()
        recommendation_service.initialize()
        
        # Connect to Redis cache
        logger.info("Connecting to Redis cache...")
        cache_service = get_cache_service()
        await cache_service.connect()
        
        # Start Kafka consumer
        logger.info("Starting Kafka consumer...")
        kafka_consumer = get_kafka_consumer()
        kafka_consumer.start()
        
        logger.info(f"✅ {settings.APP_NAME} started successfully")
        logger.info(f"   - Two-Tower model: {'✅' if model_status.get('two_tower') else '❌'}")
        logger.info(f"   - ALS model: {'✅' if model_status.get('als') else '❌'}")
        logger.info(f"   - Cache: {'✅' if cache_service.is_connected() else '❌'}")
        logger.info(f"   - Kafka: {'✅' if kafka_consumer.is_connected() else '❌'}")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        # Don't raise - allow app to start even if some components fail
        # Health endpoint will reflect the degraded state
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    
    try:
        # Stop Kafka consumer
        kafka_consumer = get_kafka_consumer()
        kafka_consumer.stop()
        
        # Disconnect from Redis
        cache_service = get_cache_service()
        await cache_service.disconnect()
        
        logger.info("✅ Shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="""
## 🤖 Recipe ML Backend API

Production-ready recommendation system powered by:
- **Two-Tower Neural Network** (Primary) - 50-60ms latency, NDCG@10: 0.35+
- **ALS Collaborative Filtering** (Fallback) - 80-100ms latency, NDCG@10: 0.28+
- **Popularity-Based** (Cold-Start) - For new users

### 🚀 Features
- Personalized recipe recommendations
- Similar user discovery
- Batch processing for campaigns
- Cold-start recommendations
- Real-time Kafka event streaming
- Redis caching (<2ms cached responses)

### 📊 Performance
- **Uncached:** 50-60ms
- **Cached:** <2ms
- **Throughput:** 40-50 RPS (200+ cached)
- **Users:** 5,000 mapped
- **Recipes:** 10,437 mapped

### 🔗 Quick Links
- [Health Check](/api/health)
- [Prometheus Metrics](/api/metrics)
- [Integration Guide](https://github.com/dipesh-malla/Recipe_Management_System/blob/main/ML_Backend/JAVA_INTEGRATION_GUIDE.md)
    """,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_tags=[
        {
            "name": "Health",
            "description": "Service health and status monitoring"
        },
        {
            "name": "Recommendations",
            "description": "ML-powered personalized recommendations"
        },
        {
            "name": "Sync",
            "description": "Data synchronization with Java backend"
        }
    ]
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with latency."""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate latency
    latency = time.time() - start_time
    
    # Log request
    logger.info(
        f"{request.method} {request.url.path}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "latency_ms": latency * 1000
        }
    )
    
    return response


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(
        f"Unhandled exception: {exc}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "error": str(exc)
        }
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred",
            "detail": str(exc) if settings.DEBUG else None
        }
    )


# Mount routers
app.include_router(health_router)
app.include_router(recommendations_router)
app.include_router(sync_router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.DEBUG else "disabled",
        "health": "/api/health",
        "metrics": "/api/metrics"
    }


# Run with uvicorn if executed directly
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower()
    )
