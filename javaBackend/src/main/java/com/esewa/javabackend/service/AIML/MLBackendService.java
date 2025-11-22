package com.esewa.javabackend.service.AIML;

import com.esewa.javabackend.config.MLBackendConfig;
import com.esewa.javabackend.dto.aiml.MLRequestDTO;
import com.esewa.javabackend.dto.aiml.MLResponseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Service for communicating with ML Backend
 * Handles all API calls to the Python FastAPI ML service
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MLBackendService {

  @Qualifier("mlRestTemplate")
  private final RestTemplate restTemplate;

  private final MLBackendConfig config;

  /**
   * Get personalized recipe recommendations for a user
   *
   * @param userId           User ID
   * @param topK             Number of recommendations (default: 20)
   * @param excludeRecipeIds Recipe IDs to exclude
   * @param filters          Additional filters (cuisine, dietary restrictions,
   *                         etc.)
   * @return Recipe recommendations response
   */
  public MLResponseDTO.RecipeRecommendationResponse getRecommendations(
      Integer userId,
      Integer topK,
      List<Integer> excludeRecipeIds,
      Map<String, Object> filters) {

    if (!config.isEnabled()) {
      log.warn("ML Backend is disabled. Returning empty recommendations.");
      return createEmptyRecommendationResponse(userId);
    }

    try {
      MLRequestDTO.RecipeRecommendationRequest request = MLRequestDTO.RecipeRecommendationRequest.builder()
          .userId(userId)
          .topK(topK != null ? topK : 20)
          .excludeRecipeIds(excludeRecipeIds)
          .filters(filters)
          .applyDiversity(true)
          .build();

      String url = config.getFullApiUrl() + "/recommendations/recipes";

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<MLRequestDTO.RecipeRecommendationRequest> entity = new HttpEntity<>(request, headers);

      log.info("Calling ML Backend: {} for user {}", url, userId);

      ResponseEntity<MLResponseDTO.RecipeRecommendationResponse> response = restTemplate.postForEntity(url, entity,
          MLResponseDTO.RecipeRecommendationResponse.class);

      if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
        log.info("ML Backend returned {} recommendations for user {} using model: {}",
            response.getBody().getRecommendations().size(),
            userId,
            response.getBody().getModelUsed());
        return response.getBody();
      }

      log.warn("ML Backend returned empty response for user {}", userId);
      return createEmptyRecommendationResponse(userId);

    } catch (HttpClientErrorException e) {
      log.error("ML Backend client error for user {}: {} - {}", userId, e.getStatusCode(), e.getResponseBodyAsString());
      return createEmptyRecommendationResponse(userId);
    } catch (HttpServerErrorException e) {
      log.error("ML Backend server error for user {}: {} - {}", userId, e.getStatusCode(), e.getResponseBodyAsString());
      return createEmptyRecommendationResponse(userId);
    } catch (ResourceAccessException e) {
      log.error("ML Backend connection error for user {}: {}", userId, e.getMessage());
      return createEmptyRecommendationResponse(userId);
    } catch (Exception e) {
      log.error("Unexpected error calling ML Backend for user {}: {}", userId, e.getMessage(), e);
      return createEmptyRecommendationResponse(userId);
    }
  }

  /**
   * Get similar users based on preferences
   *
   * @param userId User ID
   * @param topK   Number of similar users (default: 10)
   * @return Similar users response
   */
  public MLResponseDTO.UserSimilarityResponse getSimilarUsers(Integer userId, Integer topK) {
    if (!config.isEnabled()) {
      log.warn("ML Backend is disabled. Returning empty similar users.");
      return createEmptySimilarUsersResponse(userId);
    }

    try {
      MLRequestDTO.UserSimilarityRequest request = MLRequestDTO.UserSimilarityRequest.builder()
          .userId(userId)
          .topK(topK != null ? topK : 10)
          .build();

      String url = config.getFullApiUrl() + "/recommendations/users";

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<MLRequestDTO.UserSimilarityRequest> entity = new HttpEntity<>(request, headers);

      log.info("Calling ML Backend: {} for similar users of user {}", url, userId);

      ResponseEntity<MLResponseDTO.UserSimilarityResponse> response = restTemplate.postForEntity(url, entity,
          MLResponseDTO.UserSimilarityResponse.class);

      if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
        log.info("ML Backend returned {} similar users for user {}",
            response.getBody().getSimilarUsers().size(),
            userId);
        return response.getBody();
      }

      return createEmptySimilarUsersResponse(userId);

    } catch (Exception e) {
      log.error("Error calling ML Backend for similar users of user {}: {}", userId, e.getMessage());
      return createEmptySimilarUsersResponse(userId);
    }
  }

  /**
   * Get cold-start recommendations for new users
   *
   * @param preferences User preferences (cuisine, dietary restrictions, etc.)
   * @param topK        Number of recommendations
   * @return Recipe recommendations
   */
  public MLResponseDTO.RecipeRecommendationResponse getColdStartRecommendations(
      Map<String, Object> preferences,
      Integer topK) {

    if (!config.isEnabled()) {
      log.warn("ML Backend is disabled. Returning empty cold-start recommendations.");
      return createEmptyRecommendationResponse(0);
    }

    try {
      MLRequestDTO.ColdStartRequest request = MLRequestDTO.ColdStartRequest.builder()
          .preferences(preferences)
          .topK(topK != null ? topK : 20)
          .build();

      String url = config.getFullApiUrl() + "/recommendations/cold-start";

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<MLRequestDTO.ColdStartRequest> entity = new HttpEntity<>(request, headers);

      log.info("Calling ML Backend: {} for cold-start recommendations", url);

      ResponseEntity<MLResponseDTO.RecipeRecommendationResponse> response = restTemplate.postForEntity(url, entity,
          MLResponseDTO.RecipeRecommendationResponse.class);

      if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
        log.info("ML Backend returned {} cold-start recommendations",
            response.getBody().getRecommendations().size());
        return response.getBody();
      }

      return createEmptyRecommendationResponse(0);

    } catch (Exception e) {
      log.error("Error calling ML Backend for cold-start recommendations: {}", e.getMessage());
      return createEmptyRecommendationResponse(0);
    }
  }

  /**
   * Check ML Backend health status
   *
   * @return Health status or null if unavailable
   */
  public MLResponseDTO.HealthStatus getHealthStatus() {
    if (!config.isEnabled()) {
      log.warn("ML Backend is disabled.");
      return null;
    }

    try {
      String url = config.getFullApiUrl() + "/health";
      log.debug("Checking ML Backend health: {}", url);

      ResponseEntity<MLResponseDTO.HealthStatus> response = restTemplate.getForEntity(url,
          MLResponseDTO.HealthStatus.class);

      if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
        log.debug("ML Backend is healthy: {}", response.getBody().getStatus());
        return response.getBody();
      }

      return null;

    } catch (Exception e) {
      log.error("ML Backend health check failed: {}", e.getMessage());
      return null;
    }
  }

  /**
   * Check if ML Backend is available
   *
   * @return true if ML Backend is reachable, false otherwise
   */
  public boolean isAvailable() {
    if (!config.isEnabled()) {
      return false;
    }

    try {
      MLResponseDTO.HealthStatus health = getHealthStatus();
      return health != null && "healthy".equalsIgnoreCase(health.getStatus());
    } catch (Exception e) {
      log.debug("ML Backend availability check failed: {}", e.getMessage());
      return false;
    }
  }

  /**
   * Helper method to create an empty recommendation response
   */
  private MLResponseDTO.RecipeRecommendationResponse createEmptyRecommendationResponse(Integer userId) {
    return MLResponseDTO.RecipeRecommendationResponse.builder()
        .userId(userId)
        .recommendations(Collections.emptyList())
        .modelUsed("fallback")
        .cached(false)
        .latencyMs(0.0)
        .totalCandidates(0)
        .build();
  }

  /**
   * Helper method to create an empty similar users response
   */
  private MLResponseDTO.UserSimilarityResponse createEmptySimilarUsersResponse(Integer userId) {
    return MLResponseDTO.UserSimilarityResponse.builder()
        .userId(userId)
        .similarUsers(Collections.emptyList())
        .modelUsed("fallback")
        .latencyMs(0.0)
        .build();
  }
}
