# Recipe ML Backend

Production FastAPI service for personalized recipe and user recommendations using Two-Tower Neural Networks and ALS Collaborative Filtering.

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check health
curl http://localhost:8000/api/health
```

**API:** http://localhost:8000 | **Docs:** http://localhost:8000/docs

---

## Features

-  **Personalized Recommendations** - Two-Tower NN (primary) + ALS (fallback)
-  **User Similarity** - Find similar users via embeddings
-  **Batch Processing** - Multi-user recommendations
-  **Cold-Start** - Popularity-based for new users
-  **Redis Cache** - Sub-2ms response times
-  **Kafka Streaming** - Real-time interactions
-  **Prometheus Metrics** - Performance monitoring

**Performance:** 50-60ms uncached | <2ms cached | 5K users | 10K+ recipes | NDCG@10: 0.35+

---

## API Endpoints

| Endpoint                               | Description          |
| -------------------------------------- | -------------------- |
| `POST /api/recommendations/recipes`    | Personalized recipes |
| `POST /api/recommendations/users`      | Similar users        |
| `POST /api/recommendations/batch`      | Batch requests       |
| `POST /api/recommendations/cold-start` | New users            |
| `GET /api/health`                      | Health check         |
| `GET /api/metrics`                     | Prometheus metrics   |

**Example:**

```bash
curl -X POST http://localhost:8000/api/recommendations/recipes \
  -H "Content-Type: application/json" \
  -d '{"user_id": 5, "top_k": 10}'
```

**Response:**

```json
{
  "user_id": 5,
  "recommendations": [{ "recipe_id": 234, "score": 0.998, "rank": 1 }],
  "model_used": "two_tower",
  "latency_ms": 53.8
}
```

---

## Configuration

**.env file:**

```bash
DEBUG=false
PORT=8000
WORKERS=4
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
DEVICE=cpu
PRECOMPUTE_EMBEDDINGS=true
MAX_BATCH_SIZE=100
MMR_DIVERSITY_WEIGHT=0.3
```

**Docker Services:**

- `ml-backend` (8000) - API + models
- `redis` (6379) - Cache
- `kafka` (9092) - Events
- `zookeeper` (2181) - Kafka

---

## Models

### Two-Tower Neural Network

- **Architecture:** UserEncoder + RecipeEncoder (256 hidden, 128 embedding)
- **Performance:** 50-60ms, NDCG@10: 0.35+
- **Features:** Precomputed embeddings for 10,437 recipes

### ALS Collaborative Filtering

- **Method:** Matrix factorization (128 factors)
- **Performance:** 80-100ms, NDCG@10: 0.28+
- **Use:** Fallback when Two-Tower fails

### Popularity

- **Method:** Interaction count + recency
- **Use:** Cold-start for new users

**Fallback:** Two-Tower → ALS → Popularity

---

## Project Structure

```
ML_Backend/
├── docker-compose.yml       # Multi-service setup
├── Dockerfile               # API container
├── requirements.txt         # Dependencies
├── .env.example             # Config template
│
├── api/                     # FastAPI App
│   ├── main.py
│   ├── config/settings.py
│   ├── routes/              # Endpoints
│   ├── services/            # Business logic
│   ├── models/              # ML loading
│   └── schemas/             # Request/Response
│
├── RecipeML/                # ML Artifacts
│   ├── models/
│   │   ├── two_tower/       # NN model (9MB)
│   │   └── als_model_*.pkl  # ALS model (9MB)
│   ├── processed/           # Mappings
│   └── data/                # Recipes/interactions
│
└── tests/                   # Test suite
```

---

## Development

```bash
# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Start services
docker-compose up -d redis kafka zookeeper

# Run API
uvicorn api.main:app --reload

# Tests
pytest --cov=api
```

---

## Deployment

```bash
# Production
docker-compose up -d

# Scale
docker-compose up -d --scale ml-backend=3

# Logs
docker-compose logs -f ml-backend

# Stop
docker-compose down
```

### Production Checklist

- [ ] `DEBUG=false`
- [ ] Configure CORS
- [ ] Redis/Kafka auth
- [ ] SSL/TLS
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Resource limits

---

## Java Integration

**Spring Boot Client:**

```java
@Service
public class MLRecommendationService {
    private final RestTemplate restTemplate;
    private final String mlBackendUrl = "http://ml-backend:8000";

    public RecipeRecommendationResponse getRecommendations(Long userId, int topK) {
        String url = mlBackendUrl + "/api/recommendations/recipes";
        RecipeRecommendationRequest request = new RecipeRecommendationRequest();
        request.setUserId(userId);
        request.setTopK(topK);

        return restTemplate.postForEntity(url,
            new HttpEntity<>(request),
            RecipeRecommendationResponse.class
        ).getBody();
    }
}
```

**Kafka Events:**

```java
@Service
public class InteractionEventProducer {
    @Autowired
    private KafkaTemplate<String, InteractionEvent> kafkaTemplate;

    public void publishInteraction(Long userId, Long recipeId, String type) {
        kafkaTemplate.send("interactions",
            InteractionEvent.builder()
                .userId(userId)
                .recipeId(recipeId)
                .interactionType(type)
                .build()
        );
    }
}
```

---

## Troubleshooting

| Issue                | Solution                                              |
| -------------------- | ----------------------------------------------------- |
| Model failed to load | Check `RecipeML/models/two_tower/two_tower_model.pth` |
| User not found       | Use user 1-5000 or `/cold-start` endpoint             |
| Redis error          | `docker-compose up -d redis`                          |
| Kafka error          | Wait 30s for startup                                  |
| Port 8000 in use     | Change `PORT` in `.env`                               |

**Debug:**

```bash
DEBUG=true
LOG_LEVEL=DEBUG
curl http://localhost:8000/api/health | jq
docker logs recipe-ml-backend --tail 100
```

---

## Performance

| Metric             | Value                   |
| ------------------ | ----------------------- |
| Latency (uncached) | 50-60ms                 |
| Latency (cached)   | <2ms                    |
| Throughput         | 40-50 RPS (200+ cached) |
| Memory             | 1.2-2GB                 |

**Optimize:**

1. Enable `PRECOMPUTE_EMBEDDINGS=true` (-40% latency)
2. Use Redis caching (sub-2ms)
3. GPU mode `DEVICE=cuda` (2-3x faster)
4. Scale horizontally
