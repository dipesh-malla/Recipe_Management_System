package com.esewa.javabackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {

  @Bean
  public CorsFilter corsFilter() {
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    CorsConfiguration config = new CorsConfiguration();

    // Allow credentials (cookies, authorization headers)
    config.setAllowCredentials(true);

    // Allow frontend origins
    config.setAllowedOrigins(Arrays.asList(
        "http://localhost:3001", // React dev server
        "http://localhost:8080", // Vite dev server
        "http://localhost:3000", // Alternative port
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"));

    // Allow all headers
    config.setAllowedHeaders(Arrays.asList("*"));

    // Allow all HTTP methods
    config.setAllowedMethods(Arrays.asList(
        "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));

    // Expose headers that the frontend can read
    config.setExposedHeaders(Arrays.asList(
        "Authorization",
        "Content-Type",
        "X-Total-Count",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials"));

    // How long the response from a pre-flight request can be cached
    config.setMaxAge(3600L);

    // Apply CORS configuration to all endpoints
    source.registerCorsConfiguration("/**", config);

    return new CorsFilter(source);
  }
}
