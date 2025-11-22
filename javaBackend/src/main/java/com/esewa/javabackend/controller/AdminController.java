package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.enums.Messages;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController extends BaseController {

  private final JdbcTemplate jdbcTemplate;

  /**
   * Fix the follows table sequence
   * This resets the sequence to the correct value based on existing data
   */
  @PostMapping("/fix-follows-sequence")
  public ResponseEntity<GlobalApiResponse<Map<String, Object>>> fixFollowsSequence() {
    try {
      // Get the current max ID from follows table
      Integer maxId = jdbcTemplate.queryForObject(
          "SELECT COALESCE(MAX(id), 0) FROM follows",
          Integer.class);

      // Reset the sequence
      Long newSeqValue = jdbcTemplate.queryForObject(
          "SELECT setval('follows_id_seq', " + (maxId + 1) + ", false)",
          Long.class);

      log.info("Fixed follows sequence. Max ID: {}, New sequence value: {}", maxId, newSeqValue);

      return ResponseEntity.ok(successResponse(
          Map.of(
              "maxId", maxId,
              "newSequenceValue", newSeqValue,
              "message", "Sequence fixed successfully"),
          Messages.SUCCESS,
          "Follows sequence has been reset"));
    } catch (Exception e) {
      log.error("Error fixing follows sequence", e);
      return ResponseEntity.status(500).body(errorResponse(
          "Failed to fix sequence: " + e.getMessage(),
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  /**
   * Get current sequence information for debugging
   */
  @GetMapping("/sequence-info")
  public ResponseEntity<GlobalApiResponse<Map<String, Object>>> getSequenceInfo() {
    try {
      Integer maxId = jdbcTemplate.queryForObject(
          "SELECT COALESCE(MAX(id), 0) FROM follows",
          Integer.class);

      Long currentSeq = jdbcTemplate.queryForObject(
          "SELECT last_value FROM follows_id_seq",
          Long.class);

      Long followCount = jdbcTemplate.queryForObject(
          "SELECT COUNT(*) FROM follows",
          Long.class);

      return ResponseEntity.ok(successResponse(
          Map.of(
              "maxId", maxId,
              "currentSequenceValue", currentSeq,
              "followCount", followCount,
              "sequenceNeedsReset", currentSeq <= maxId),
          Messages.SUCCESS,
          "Sequence information retrieved"));
    } catch (Exception e) {
      log.error("Error getting sequence info", e);
      return ResponseEntity.status(500).body(errorResponse(
          "Failed to get sequence info: " + e.getMessage(),
          org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}
