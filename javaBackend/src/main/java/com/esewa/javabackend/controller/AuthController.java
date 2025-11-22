package com.esewa.javabackend.controller;

import com.esewa.javabackend.dto.UserDTO.UserRequestDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import com.esewa.javabackend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AuthController {

  private final UserService userService;
  private final UserRepository userRepository;

  @PostMapping("/register")
  public ResponseEntity<Map<String, Object>> register(@RequestBody UserRequestDTO userRequestDTO) {
    try {
      log.info("Registration request received for email: {}", userRequestDTO.getEmail());

      // Check if user already exists
      if (userRepository.findByEmail(userRequestDTO.getEmail()).isPresent()) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("message", "User with this email already exists");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
      }

      if (userRepository.findByUsername(userRequestDTO.getUsername()).isPresent()) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("message", "Username already taken");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
      }

      // Save user
      Integer userId = userService.saveUser(userRequestDTO);
      UserResponseDTO user = userService.getUserById(userId);

      // Generate a simple token (in production, use JWT)
      String token = UUID.randomUUID().toString();

      Map<String, Object> data = new HashMap<>();
      data.put("token", token);
      data.put("user", user);
      data.put("message", "Registration successful");

      Map<String, Object> response = new HashMap<>();
      response.put("data", data);

      log.info("User registered successfully: {}", user.getEmail());
      return ResponseEntity.status(HttpStatus.CREATED).body(response);

    } catch (org.hibernate.exception.ConstraintViolationException e) {
      log.error("Constraint violation during registration", e);
      Map<String, Object> errorResponse = new HashMap<>();
      if (e.getMessage().contains("email")) {
        errorResponse.put("message", "User with this email already exists");
      } else if (e.getMessage().contains("username")) {
        errorResponse.put("message", "Username already taken");
      } else {
        errorResponse.put("message", "Registration failed: duplicate data");
      }
      return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    } catch (org.springframework.dao.DataIntegrityViolationException e) {
      log.error("Data integrity violation during registration", e);
      Map<String, Object> errorResponse = new HashMap<>();
      if (e.getMessage().contains("email")) {
        errorResponse.put("message", "User with this email already exists");
      } else if (e.getMessage().contains("username")) {
        errorResponse.put("message", "Username already taken");
      } else {
        errorResponse.put("message", "Registration failed: duplicate data");
      }
      return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    } catch (Exception e) {
      log.error("Registration failed", e);
      Map<String, Object> errorResponse = new HashMap<>();
      errorResponse.put("message", "Registration failed: " + e.getMessage());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
  }

  @PostMapping("/login")
  public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest) {
    try {
      String email = loginRequest.get("email");
      String password = loginRequest.get("password");

      log.info("Login request received for email: {}", email);

      // Find user by email
      User user = userRepository.findByEmail(email)
          .orElseThrow(() -> new RuntimeException("Invalid credentials"));

      // In production, verify password with BCrypt
      // For now, simple password check
      if (!user.getPassword().equals(password)) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("message", "Invalid credentials"));
      }

      // Generate a simple token (in production, use JWT)
      String token = UUID.randomUUID().toString();

      UserResponseDTO userDTO = userService.getUserById(user.getId());

      Map<String, Object> data = new HashMap<>();
      data.put("token", token);
      data.put("user", userDTO);
      data.put("message", "Login successful");

      Map<String, Object> response = new HashMap<>();
      response.put("data", data);

      log.info("User logged in successfully: {}", email);
      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("Login failed", e);
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body(Map.of("message", "Login failed: " + e.getMessage()));
    }
  }

  @GetMapping("/me")
  public ResponseEntity<Map<String, Object>> getCurrentUser(
      @RequestHeader(value = "Authorization", required = false) String token) {
    // In production, decode JWT token to get user ID
    // For now, return a placeholder response
    return ResponseEntity.ok(Map.of("message", "Auth endpoint - implement JWT verification"));
  }

  @PostMapping("/logout")
  public ResponseEntity<Map<String, Object>> logout() {
    // In production, invalidate token
    return ResponseEntity.ok(Map.of("message", "Logout successful"));
  }
}
