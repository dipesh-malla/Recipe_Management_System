"""
Prometheus metrics for monitoring.
Tracks request latency, model usage, cache hits, and errors.
"""
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from api.config.settings import settings

# Create registry
registry = CollectorRegistry()

# Request metrics
request_duration = Histogram(
    'ml_backend_request_duration_seconds',
    'Request duration in seconds',
    ['endpoint', 'method'],
    registry=registry,
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]
)

request_count = Counter(
    'ml_backend_request_total',
    'Total number of requests',
    ['endpoint', 'method', 'status'],
    registry=registry
)

# Model metrics
model_inference_duration = Histogram(
    'ml_backend_model_inference_duration_seconds',
    'Model inference duration in seconds',
    ['model'],
    registry=registry,
    buckets=[0.001, 0.01, 0.05, 0.1, 0.5, 1.0]
)

model_usage_count = Counter(
    'ml_backend_model_usage_total',
    'Number of times each model was used',
    ['model'],
    registry=registry
)

model_loaded = Gauge(
    'ml_backend_model_loaded',
    'Whether models are loaded (1) or not (0)',
    ['model'],
    registry=registry
)

# Cache metrics
cache_hit_count = Counter(
    'ml_backend_cache_hit_total',
    'Number of cache hits',
    ['cache_type'],
    registry=registry
)

cache_miss_count = Counter(
    'ml_backend_cache_miss_total',
    'Number of cache misses',
    ['cache_type'],
    registry=registry
)

# Error metrics
error_count = Counter(
    'ml_backend_error_total',
    'Number of errors',
    ['error_type', 'endpoint'],
    registry=registry
)

# Recommendation metrics
recommendation_count = Counter(
    'ml_backend_recommendation_total',
    'Number of recommendations generated',
    ['model', 'cached'],
    registry=registry
)

recommendation_diversity = Histogram(
    'ml_backend_recommendation_diversity',
    'Diversity score of recommendations',
    ['model'],
    registry=registry,
    buckets=[0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)


class Metrics:
    """Wrapper class for metrics."""
    
    def __init__(self):
        self.registry = registry
        self.request_duration = request_duration
        self.request_count = request_count
        self.model_inference_duration = model_inference_duration
        self.model_usage_count = model_usage_count
        self.model_loaded = model_loaded
        self.cache_hit_count = cache_hit_count
        self.cache_miss_count = cache_miss_count
        self.error_count = error_count
        self.recommendation_count = recommendation_count
        self.recommendation_diversity = recommendation_diversity
    
    def export(self) -> bytes:
        """Export metrics in Prometheus format."""
        return generate_latest(self.registry)


# Singleton instance
metrics = Metrics()
