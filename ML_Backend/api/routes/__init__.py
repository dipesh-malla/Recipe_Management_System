"""Routes package."""
from .recommendations import router as recommendations_router
from .health import router as health_router
from .sync import router as sync_router

__all__ = ["recommendations_router", "health_router", "sync_router"]
