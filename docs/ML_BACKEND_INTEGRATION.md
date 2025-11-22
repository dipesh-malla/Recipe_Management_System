# ML Backend Integration Guide

## Overview

This document describes the complete integration between the Java Spring Boot backend and the Python FastAPI ML Backend for personalized recipe recommendations.

## Architecture

```
Frontend (React)
    ↓
Java Backend (Spring Boot) :8090
    ↓
ML Backend (FastAPI) :8000
    ↓
ML Models (Two-Tower Neural Network + ALS)
```

## Components Created

### 1. Configuration (`MLBackendConfig.java`)

**Location:** `javaBackend/src/main/java/com/esewa/javabackend/config/MLBackendConfig.java`

**Purpose:** Configures HTTP client for ML Backend communication

**Key Features:**

- RestTemplate bean with custom timeouts
- Connection pooling settings
- Enable/disable ML Backend dynamically
- Configurable via `application.yml`

**Configuration Properties:**

```yaml
ml:
  backend:
    enabled: true # Enable/disable ML Backend
    url: http://localhost:8000 # ML Backend base URL
    api-path: /api # API path prefix
    connect-timeout: 5000 # Connection timeout (ms)
    read-timeout: 30000 # Read timeout (ms)
    max-total-connections: 100 # Connection pool size
    max-per-route: 50 # Connections per route
```

### 2. Request DTOs (`MLRequestDTO.java`)

**Location:** `javaBackend/src/main/java/com/esewa/javabackend/dto/aiml/MLRequestDTO.java`

**Purpose:** Build type-safe requests to ML Backend

**Classes:**

- `RecipeRecommendationRequest` - Get personalized recipe recommendations
- `UserSimilarityRequest` - Find similar users
- `BatchRecommendationRequest` - Batch recommendations for campaigns
- `ColdStartRequest` - Recommendations for new users without history

**Example Usage:**

```java
MLRequestDTO.RecipeRecommendationRequest request =
    MLRequestDTO.RecipeRecommendationRequest.builder()
        .userId(1)
        .topK(20)
        .applyDiversity(true)
        .diversityWeight(0.3)
        .build();
```

### 3. Response DTOs (`MLResponseDTO.java`)

**Location:** `javaBackend/src/main/java/com/esewa/javabackend/dto/aiml/MLResponseDTO.java`

**Purpose:** Map ML Backend JSON responses to Java objects

**Classes:**

- `RecipeRecommendationResponse` - Recipe recommendations with scores
- `RecipeRecommendation` - Single recipe with score/rank
- `UserSimilarityResponse` - Similar users response
- `UserSimilarity` - Single similar user with similarity score
- `HealthStatus` - ML Backend health metrics

**Response Structure:**

```json
{
  "user_id": 1,
  "recommendations": [
    {
      "recipe_id": 42,
      "score": 0.95,
      "rank": 1
    }
  ],
  "model_used": "two_tower",
  "cached": false,
  "latency_ms": 45.3,
  "total_candidates": 1000
}
```

### 4. ML Backend Service (`MLBackendService.java`)

**Location:** `javaBackend/src/main/java/com/esewa/javabackend/service/AIML/MLBackendService.java`

**Purpose:** HTTP client service for ML Backend communication

**Key Methods:**

- `getRecommendations()` - Get personalized recipe recommendations
- `getSimilarUsers()` - Find similar users
- `getColdStartRecommendations()` - Recommendations for new users
- `getHealthStatus()` - Check ML Backend health
- `isAvailable()` - Quick availability check

**Error Handling:**

- Graceful fallback when ML Backend is unavailable
- Returns empty recommendations instead of throwing exceptions
- Comprehensive logging for debugging
- Handles HttpClientErrorException, HttpServerErrorException, ResourceAccessException

### 5. Controller Integration (`AIMLController.java`)

**Location:** `javaBackend/src/main/java/com/esewa/javabackend/controller/AIMLController.java`

**Purpose:** Expose ML recommendations via REST API

**New Endpoints:**

#### Get Recipe Recommendations

```http
GET /api/aiml/recommendations/recipes?userId=1&topK=10
```

**Query Parameters:**

- `userId` (required) - User ID
- `topK` (optional, default: 20) - Number of recommendations
- `excludeRecipeIds` (optional) - Recipe IDs to exclude
- `filters` (optional) - Additional filters (cuisine, dietary, etc.)

**Response:**

```json
{
  "userId": 1,
  "recommendations": [
    {
      "recipeId": 42,
      "score": 0.95,
      "rank": 1
    },
    {
      "recipeId": 15,
      "score": 0.89,
      "rank": 2
    }
  ],
  "modelUsed": "two_tower",
  "cached": false,
  "latencyMs": 45.3,
  "totalCandidates": 1000
}
```

#### Get Similar Users

```http
GET /api/aiml/recommendations/similar-users?userId=1&topK=10
```

**Response:**

```json
{
  "userId": 1,
  "similarUsers": [
    {
      "userId": 23,
      "similarityScore": 0.87
    },
    {
      "userId": 15,
      "similarityScore": 0.82
    }
  ],
  "modelUsed": "two_tower",
  "latencyMs": 32.1
}
```

#### Get Cold-Start Recommendations

```http
GET /api/aiml/recommendations/cold-start?preferences={"cuisine":"Italian","dietary":"vegetarian"}&topK=20
```

**Response:** Same as recipe recommendations

#### Check ML Backend Health

```http
GET /api/aiml/ml-health
```

**Response:**

```json
{
  "ml_backend_available": true,
  "status": "healthy",
  "models": {
    "two_tower": "loaded",
    "als": "loaded"
  },
  "services": {
    "kafka_consumer": "running",
    "cache": "ready"
  },
  "system": {
    "cpu_percent": 15.3,
    "memory_percent": 42.1
  }
}
```

## Setup Instructions

### 1. Start ML Backend

```bash
cd ML_Backend
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Verify ML Backend is running:

```bash
curl http://localhost:8000/api/health
```

### 2. Configuration in application.yml

The configuration is already added to `application.yml`. Ensure ML Backend URL matches your setup:

```yaml
ml:
  backend:
    enabled: true
    url: http://localhost:8000
```

### 3. Start Java Backend

```bash
cd javaBackend
mvnw spring-boot:run
```

Backend will automatically connect to ML Backend if it's running.

### 4. Test Integration

**Test Health Check:**

```bash
curl http://localhost:8090/api/aiml/ml-health
```

**Test Recommendations:**

```bash
curl "http://localhost:8090/api/aiml/recommendations/recipes?userId=1&topK=10"
```

**Test Similar Users:**

```bash
curl "http://localhost:8090/api/aiml/recommendations/similar-users?userId=1&topK=5"
```

## Frontend Integration

Update your frontend to call the Java backend endpoints:

```typescript
// In your frontend api.ts or similar

export const getRecommendations = async (
  userId: number,
  topK: number = 20
): Promise<RecipeRecommendationResponse> => {
  const response = await javaApiFetch(
    `/aiml/recommendations/recipes?userId=${userId}&topK=${topK}`
  );
  return response;
};

export const getSimilarUsers = async (
  userId: number,
  topK: number = 10
): Promise<UserSimilarityResponse> => {
  const response = await javaApiFetch(
    `/aiml/recommendations/similar-users?userId=${userId}&topK=${topK}`
  );
  return response;
};

export const checkMLHealth = async () => {
  const response = await javaApiFetch(`/aiml/ml-health`);
  return response;
};
```

## Error Handling & Fallback Strategy

### When ML Backend is Unavailable

The service implements graceful degradation:

1. **Returns Empty Recommendations:** Instead of throwing exceptions, returns empty result sets
2. **Logs Errors:** All errors are logged with context for debugging
3. **Fallback Model Indicator:** `modelUsed: "fallback"` in response indicates ML Backend was unavailable
4. **Can Be Disabled:** Set `ml.backend.enabled: false` to disable ML calls entirely

### Example Fallback Response

```json
{
  "userId": 1,
  "recommendations": [],
  "modelUsed": "fallback",
  "cached": false,
  "latencyMs": 0.0,
  "totalCandidates": 0
}
```

Your frontend should handle empty recommendations gracefully and show alternative content (e.g., popular recipes, trending content).

## Monitoring & Debugging

### Check ML Backend Status

```bash
# Health check
curl http://localhost:8090/api/aiml/ml-health

# Direct ML Backend health
curl http://localhost:8000/api/health
```

### Java Backend Logs

Look for these log messages:

```
INFO  - Calling ML Backend: http://localhost:8000/api/recommendations/recipes for user 1
INFO  - ML Backend returned 10 recommendations for user 1 using model: two_tower
ERROR - ML Backend connection error for user 1: Connection refused
```

### Common Issues

**Issue:** `Connection refused` errors

- **Solution:** Ensure ML Backend is running on port 8000
- **Check:** `curl http://localhost:8000/api/health`

**Issue:** Empty recommendations returned

- **Solution:** Check ML Backend logs, ensure models are loaded
- **Check:** `GET /api/aiml/ml-health` - verify `models.two_tower: "loaded"`

**Issue:** Slow response times

- **Solution:** Check ML Backend system resources
- **Solution:** Verify Redis cache is working
- **Solution:** Adjust `read-timeout` in application.yml

## Performance Considerations

### Caching

- ML Backend uses Redis for caching recommendations
- Cache TTL: 300 seconds (5 minutes)
- Check `cached: true` in response to see if result was cached

### Timeouts

- **Connection timeout:** 5 seconds (configurable)
- **Read timeout:** 30 seconds (configurable for ML inference)
- Adjust these in `application.yml` based on your needs

### Connection Pooling

- Default: 100 total connections, 50 per route
- Adjust in `application.yml` based on load

## Production Deployment

### Environment Variables

Override configuration via environment variables:

```bash
export ML_BACKEND_URL=http://ml-backend:8000
export ML_BACKEND_ENABLED=true
export ML_BACKEND_CONNECT_TIMEOUT=5000
export ML_BACKEND_READ_TIMEOUT=30000
```

### Docker Deployment

Add ML Backend service to your `docker-compose.yml`:

```yaml
services:
  ml-backend:
    build: ./ML_Backend
    ports:
      - "8000:8000"
    environment:
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
      - REDIS_HOST=redis
    depends_on:
      - kafka
      - redis

  java-backend:
    build: ./javaBackend
    ports:
      - "8090:8090"
    environment:
      - ML_BACKEND_URL=http://ml-backend:8000
    depends_on:
      - ml-backend
```

### Kubernetes

Use service discovery:

```yaml
ml:
  backend:
    url: http://ml-backend-service:8000
```

## Testing

### Unit Tests

Test MLBackendService with MockRestTemplate:

```java
@Test
void testGetRecommendations() {
    // Mock RestTemplate response
    when(restTemplate.postForEntity(anyString(), any(), any()))
        .thenReturn(ResponseEntity.ok(mockResponse));

    // Test service
    var result = mlBackendService.getRecommendations(1, 10, null, null);

    assertNotNull(result);
    assertEquals(10, result.getRecommendations().size());
}
```

### Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "ml.backend.enabled=true",
    "ml.backend.url=http://localhost:8000"
})
class MLBackendIntegrationTest {
    @Autowired
    private MLBackendService mlBackendService;

    @Test
    void testMLBackendConnection() {
        MLResponseDTO.HealthStatus health = mlBackendService.getHealthStatus();
        assertNotNull(health);
        assertEquals("healthy", health.getStatus());
    }
}
```

## Next Steps

1. **Frontend Integration:** Update React components to use new recommendation endpoints
2. **User Experience:** Display personalized recommendations on homepage, recipe pages
3. **Analytics:** Track recommendation click-through rates
4. **A/B Testing:** Compare ML recommendations vs. random/popular recipes
5. **Monitoring:** Set up alerts for ML Backend availability
6. **Optimization:** Tune recommendation parameters based on user feedback

## Support

For issues or questions:

- Check logs in `javaBackend/logs/` and ML Backend console
- Verify all services are running: `docker-compose ps`
- Test ML Backend directly: `curl http://localhost:8000/api/health`
- Review this documentation for troubleshooting steps

---

**Last Updated:** 2024
**Version:** 1.0
**Author:** Recipe Management System Team
