package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.InteractionDTO;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.AIML.InteractionService;
import com.esewa.javabackend.service.LocalSaveService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saves")
@RequiredArgsConstructor
public class SavesController extends BaseController {

  private final InteractionService interactionService;

  // Local fallback persistence for a specific user (userId 84)
  @org.springframework.beans.factory.annotation.Autowired
  private LocalSaveService localSaveService;

  @GetMapping("/{userId}")
  public ResponseEntity<GlobalApiResponse<List<InteractionDTO>>> getSavedByUser(@PathVariable Integer userId) {
    try {
      List<InteractionDTO> dbList = interactionService.getInteractionsByUserAndAction(userId);
      List<InteractionDTO> list = dbList != null ? dbList : new java.util.ArrayList<>();

      // If this is the special user we keep local saves for, merge them but avoid
      // duplicates.
      if (userId != null && userId.equals(84)) {
        List<InteractionDTO> local = localSaveService.getSavesForUser(userId);
        if (local != null && !local.isEmpty()) {
          // Build map keyed by resourceType:resourceId and prefer DB entries when
          // present.
          java.util.LinkedHashMap<String, InteractionDTO> map = new java.util.LinkedHashMap<>();
          // Add DB entries first so they take precedence
          for (InteractionDTO dto : list) {
            String key = (dto.getResourceType() != null ? dto.getResourceType().name() : "") + ":"
                + (dto.getResourceId() != null ? dto.getResourceId() : "");
            map.put(key, dto);
          }
          // Add local entries only if key not present
          for (InteractionDTO dto : local) {
            String key = (dto.getResourceType() != null ? dto.getResourceType().name() : "") + ":"
                + (dto.getResourceId() != null ? dto.getResourceId() : "");
            if (!map.containsKey(key)) {
              map.put(key, dto);
            }
          }
          // Build final list and sort by createdAT desc when possible
          java.util.List<InteractionDTO> merged = new java.util.ArrayList<>(map.values());
          merged.sort((a, b) -> {
            java.time.Instant ia = a.getCreatedAT();
            java.time.Instant ib = b.getCreatedAT();
            if (ia == null && ib == null)
              return 0;
            if (ia == null)
              return 1;
            if (ib == null)
              return -1;
            return ib.compareTo(ia);
          });
          list = merged;
        }
      }
      return ResponseEntity.ok(successResponse(list, Messages.SUCCESS, "Saved items fetched"));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(errorResponse("Failed to fetch saves: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  @PostMapping("")
  public ResponseEntity<GlobalApiResponse<InteractionDTO>> saveResource(
      @RequestBody(required = false) java.util.Map<String, Object> body,
      @RequestHeader(value = "X-User-Id", required = false) String xUserIdHeader) {
    try {
      if (body == null) {
        return ResponseEntity.badRequest().body(errorResponse("Request body is required", HttpStatus.BAD_REQUEST));
      }

      // Resolve userId: prefer explicit body.userId, fallback to X-User-Id header
      Integer userId = null;
      try {
        Object u = body.get("userId");
        if (u instanceof Number)
          userId = ((Number) u).intValue();
        else if (u instanceof String && !((String) u).isBlank())
          userId = Integer.valueOf((String) u);
      } catch (Exception ignored) {
      }
      if (userId == null && xUserIdHeader != null && !xUserIdHeader.isBlank()) {
        try {
          userId = Integer.valueOf(xUserIdHeader.trim());
        } catch (NumberFormatException ignored) {
        }
      }

      if (userId == null) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(
                errorResponse("User id is required either in body.userId or X-User-Id header", HttpStatus.BAD_REQUEST));
      }

      // Parse resourceType (allow string values)
      Object rtObj = body.get("resourceType");
      com.esewa.javabackend.enums.ResourceType resourceType = null;
      if (rtObj instanceof com.esewa.javabackend.enums.ResourceType) {
        resourceType = (com.esewa.javabackend.enums.ResourceType) rtObj;
      } else if (rtObj instanceof String) {
        try {
          resourceType = com.esewa.javabackend.enums.ResourceType.valueOf(((String) rtObj).toUpperCase());
        } catch (IllegalArgumentException iae) {
          return ResponseEntity.status(HttpStatus.BAD_REQUEST)
              .body(errorResponse("Invalid resourceType: " + rtObj, HttpStatus.BAD_REQUEST));
        }
      }

      if (resourceType == null) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(errorResponse("resourceType is required and must be one of POST, RECIPE, USER",
                HttpStatus.BAD_REQUEST));
      }

      // Parse resourceId
      Integer resourceId = null;
      try {
        Object r = body.get("resourceId");
        if (r instanceof Number)
          resourceId = ((Number) r).intValue();
        else if (r instanceof String && !((String) r).isBlank())
          resourceId = Integer.valueOf((String) r);
      } catch (Exception ignored) {
      }

      // resourceId may be null for some resource types; validate as needed

      // Persist save interaction
      InteractionDTO saved;
      if (userId.equals(84)) {
        // For this user use local fallback storage to avoid DB schema changes for now
        saved = localSaveService.saveForUser(userId, resourceType, resourceId);
      } else {
        saved = interactionService.logSave(userId, resourceType, resourceId);
      }
      return ResponseEntity.ok(successResponse(saved, Messages.SUCCESS, "Saved successfully"));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(errorResponse("Failed to save resource: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  @DeleteMapping("/delete/{id}")
  public ResponseEntity<GlobalApiResponse<?>> deleteSave(@PathVariable Integer id) {
    try {
      interactionService.deleteInteraction(id);
      return ResponseEntity.ok(successResponse(null, Messages.SUCCESS, "Un-saved successfully"));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(errorResponse("Failed to delete save: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}
