package com.esewa.javabackend.dto.aiml;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

/**
 * Response DTOs for ML Backend API calls
 */
public class MLResponseDTO {

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class RecipeRecommendation {
    @JsonProperty("recipe_id")
    private Integer recipeId;

    @JsonProperty("score")
    private Double score;

    @JsonProperty("rank")
    private Integer rank;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class RecipeRecommendationResponse {
    @JsonProperty("user_id")
    private Integer userId;

    @JsonProperty("recommendations")
    private List<RecipeRecommendation> recommendations;

    @JsonProperty("model_used")
    private String modelUsed;

    @JsonProperty("cached")
    private Boolean cached;

    @JsonProperty("latency_ms")
    private Double latencyMs;

    @JsonProperty("total_candidates")
    private Integer totalCandidates;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class UserSimilarity {
    @JsonProperty("user_id")
    private Integer userId;

    @JsonProperty("similarity_score")
    private Double similarityScore;

    @JsonProperty("common_preferences")
    private List<String> commonPreferences;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class UserSimilarityResponse {
    @JsonProperty("user_id")
    private Integer userId;

    @JsonProperty("similar_users")
    private List<UserSimilarity> similarUsers;

    @JsonProperty("model_used")
    private String modelUsed;

    @JsonProperty("latency_ms")
    private Double latencyMs;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class HealthStatus {
    private String status;
    private String timestamp;
    private String version;
    private ModelsStatus models;
    private ServicesStatus services;
    private SystemMetrics system;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ModelsStatus {
    @JsonProperty("two_tower_loaded")
    private Boolean twoTowerLoaded;

    @JsonProperty("als_loaded")
    private Boolean alsLoaded;

    @JsonProperty("users_mapped")
    private Integer usersMapped;

    @JsonProperty("recipes_mapped")
    private Integer recipesMapped;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ServicesStatus {
    @JsonProperty("cache_connected")
    private Boolean cacheConnected;

    @JsonProperty("kafka_connected")
    private Boolean kafkaConnected;

    @JsonProperty("kafka_events_processed")
    private Integer kafkaEventsProcessed;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class SystemMetrics {
    @JsonProperty("memory_usage_mb")
    private Double memoryUsageMb;

    @JsonProperty("cache_size")
    private Integer cacheSize;

    @JsonProperty("uptime_seconds")
    private Double uptimeSeconds;
  }
}
