package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.enums.Messages;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthCheckController extends BaseController {

  @GetMapping
  public ResponseEntity<GlobalApiResponse<Map<String, Object>>> healthCheck() {
    Map<String, Object> healthData = new HashMap<>();
    healthData.put("status", "UP");
    healthData.put("service", "Recipe Management API");
    healthData.put("version", "1.0.0");
    healthData.put("timestamp", LocalDateTime.now());
    healthData.put("message", "Backend is running successfully");

    return ResponseEntity.ok(successResponse(
        healthData,
        Messages.SUCCESS,
        "Health check successful"));
  }

  @GetMapping("/ping")
  public ResponseEntity<GlobalApiResponse<String>> ping() {
    return ResponseEntity.ok(successResponse(
        "pong",
        Messages.SUCCESS,
        "Ping successful"));
  }
}
