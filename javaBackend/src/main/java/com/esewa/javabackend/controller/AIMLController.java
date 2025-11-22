package com.esewa.javabackend.controller;

import com.esewa.javabackend.dto.InteractionDTO;
import com.esewa.javabackend.dto.aiml.EmbeddingDTO;
import com.esewa.javabackend.dto.aiml.MLResponseDTO;
import com.esewa.javabackend.enums.*;
import com.esewa.javabackend.module.AIML.Embedding;
import com.esewa.javabackend.service.AIML.EmbeddingService;
import com.esewa.javabackend.service.AIML.InteractionService;
import com.esewa.javabackend.service.AIML.MLBackendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/aiml")
@RequiredArgsConstructor
public class AIMLController {

    private final InteractionService interactionService;
    private final EmbeddingService embeddingService;
    private final MLBackendService mlBackendService;

    @PostMapping("/interactions")
    public ResponseEntity<InteractionDTO> logInteraction(
            @RequestBody InteractionDTO interactionDTO) {

        interactionService.logInteraction(interactionDTO.getUserId(), interactionDTO.getResourceType(),
                interactionDTO.getResourceId(), interactionDTO.getAction(), interactionDTO.getValue());
        return ResponseEntity.ok(interactionService.logInteraction(
                interactionDTO.getUserId(),
                interactionDTO.getResourceType(),
                interactionDTO.getResourceId(),
                interactionDTO.getAction(),
                interactionDTO.getValue()));

    }

    @GetMapping("/getAllInteraction")
    public ResponseEntity<List<InteractionDTO>> getAllInteraction() {
        return ResponseEntity.ok(interactionService.allInteraction());
    }

    // @GetMapping("/interactions/{userId}")
    // public ResponseEntity<List<Interaction>> getInteractionsByUser(@PathVariable
    // Integer userId) {
    // return ResponseEntity.ok(interactionService.getInteractionsByUser(userId));
    // }

    @PostMapping("/embeddings")
    public ResponseEntity<Embedding> createOrUpdateEmbedding(
            @RequestParam ObjectType objectType,
            @RequestParam Integer objectId,
            @RequestParam String modelVersion,
            @RequestBody float[] vector) {

        Embedding saved = embeddingService.saveOrUpdateEmbedding(objectType, objectId, vector, modelVersion);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/embeddings/{objectType}/{objectId}")
    public ResponseEntity<Embedding> getEmbedding(
            @PathVariable ObjectType objectType,
            @PathVariable Integer objectId) {

        Embedding embedding = embeddingService.getEmbedding(objectType, objectId);
        return embedding != null ? ResponseEntity.ok(embedding) : ResponseEntity.notFound().build();
    }

    @GetMapping("/embeddings/{objectType}")
    public ResponseEntity<List<Embedding>> getAllByType(@PathVariable ObjectType objectType) {
        return ResponseEntity.ok(embeddingService.getAllByType(objectType));
    }

    @GetMapping
    public ResponseEntity<List<EmbeddingDTO>> getAllEmbeddings() {
        return ResponseEntity.ok(embeddingService.getAllEmbeddings());
    }

    // ==================== ML Backend Recommendation Endpoints ====================

    /**
     * Get personalized recipe recommendations for a user
     * 
     * Example: GET /api/aiml/recommendations/recipes?userId=1&topK=10
     */
    @GetMapping("/recommendations/recipes")
    public ResponseEntity<MLResponseDTO.RecipeRecommendationResponse> getRecipeRecommendations(
            @RequestParam Integer userId,
            @RequestParam(required = false, defaultValue = "20") Integer topK,
            @RequestParam(required = false) List<Integer> excludeRecipeIds,
            @RequestParam(required = false) Map<String, Object> filters) {

        MLResponseDTO.RecipeRecommendationResponse response = mlBackendService.getRecommendations(userId, topK,
                excludeRecipeIds, filters);

        return ResponseEntity.ok(response);
    }

    /**
     * Get similar users based on preferences
     * 
     * Example: GET /api/aiml/recommendations/similar-users?userId=1&topK=10
     */
    @GetMapping("/recommendations/similar-users")
    public ResponseEntity<MLResponseDTO.UserSimilarityResponse> getSimilarUsers(
            @RequestParam Integer userId,
            @RequestParam(required = false, defaultValue = "10") Integer topK) {

        MLResponseDTO.UserSimilarityResponse response = mlBackendService.getSimilarUsers(userId, topK);

        return ResponseEntity.ok(response);
    }

    /**
     * Get cold-start recommendations for new users (no interaction history)
     * 
     * Example: GET
     * /api/aiml/recommendations/cold-start?preferences={"cuisine":"Italian","dietary":"vegetarian"}&topK=20
     */
    @GetMapping("/recommendations/cold-start")
    public ResponseEntity<MLResponseDTO.RecipeRecommendationResponse> getColdStartRecommendations(
            @RequestParam Map<String, Object> preferences,
            @RequestParam(required = false, defaultValue = "20") Integer topK) {

        MLResponseDTO.RecipeRecommendationResponse response = mlBackendService.getColdStartRecommendations(preferences,
                topK);

        return ResponseEntity.ok(response);
    }

    /**
     * Check ML Backend health status
     * 
     * Example: GET /api/aiml/ml-health
     */
    @GetMapping("/ml-health")
    public ResponseEntity<Map<String, Object>> getMLBackendHealth() {
        MLResponseDTO.HealthStatus health = mlBackendService.getHealthStatus();

        if (health == null) {
            return ResponseEntity.ok(Map.of(
                    "ml_backend_available", false,
                    "status", "unavailable"));
        }

        return ResponseEntity.ok(Map.of(
                "ml_backend_available", true,
                "status", health.getStatus(),
                "models", health.getModels(),
                "services", health.getServices(),
                "system", health.getSystem()));
    }
}
