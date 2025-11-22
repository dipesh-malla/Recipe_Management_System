package com.esewa.javabackend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for ML Backend Integration
 * Configures RestTemplate with proper timeouts and connection pooling
 */
@Configuration
@ConfigurationProperties(prefix = "ml.backend")
@Getter
@Setter
public class MLBackendConfig {

  /**
   * ML Backend base URL (default: http://localhost:8000)
   */
  private String url = "http://localhost:8000";

  /**
   * API base path (default: /api)
   */
  private String apiPath = "/api";

  /**
   * Connection timeout in milliseconds (default: 5000ms)
   */
  private int connectTimeout = 5000;

  /**
   * Read timeout in milliseconds (default: 30000ms)
   */
  private int readTimeout = 30000;

  /**
   * Maximum total connections (default: 100)
   */
  private int maxTotalConnections = 100;

  /**
   * Maximum connections per route (default: 50)
   */
  private int maxConnectionsPerRoute = 50;

  /**
   * Whether ML Backend integration is enabled (default: true)
   */
  private boolean enabled = true;

  /**
   * Creates RestTemplate bean configured for ML Backend communication
   * Uses SimpleClientHttpRequestFactory with timeout configuration
   */
  @Bean(name = "mlRestTemplate")
  public RestTemplate mlRestTemplate(RestTemplateBuilder builder) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(connectTimeout);
    factory.setReadTimeout(readTimeout);

    return builder
        .requestFactory(() -> factory)
        .build();
  }

  /**
   * Gets the full API base URL
   */
  public String getFullApiUrl() {
    return url + apiPath;
  }
}
