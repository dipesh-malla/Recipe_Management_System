package com.esewa.javabackend.dto.aiml;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;
import java.util.Map;

/**
 * Request DTOs for ML Backend API calls
 */
public class MLRequestDTO {

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class RecipeRecommendationRequest {
    @JsonProperty("user_id")
    private Integer userId;

    @JsonProperty("top_k")
    @Builder.Default
    private Integer topK = 20;

    @JsonProperty("exclude_recipe_ids")
    private List<Integer> excludeRecipeIds;

    @JsonProperty("filters")
    private Map<String, Object> filters;

    @JsonProperty("apply_diversity")
    @Builder.Default
    private Boolean applyDiversity = false;

    @JsonProperty("diversity_weight")
    @Builder.Default
    private Double diversityWeight = 0.3;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class UserSimilarityRequest {
    @JsonProperty("user_id")
    private Integer userId;

    @JsonProperty("top_k")
    @Builder.Default
    private Integer topK = 10;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class BatchRecommendationRequest {
    @JsonProperty("user_ids")
    private List<Integer> userIds;

    @JsonProperty("top_k")
    @Builder.Default
    private Integer topK = 20;

    @JsonProperty("apply_diversity")
    @Builder.Default
    private Boolean applyDiversity = false;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ColdStartRequest {
    @JsonProperty("preferences")
    private Map<String, Object> preferences;

    @JsonProperty("top_k")
    @Builder.Default
    private Integer topK = 20;

    @JsonProperty("exclude_recipe_ids")
    private List<Integer> excludeRecipeIds;
  }
}
