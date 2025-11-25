package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.InteractionDTO;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.AIML.InteractionService;
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

  @GetMapping("/{userId}")
  public ResponseEntity<GlobalApiResponse<List<InteractionDTO>>> getSavedByUser(@PathVariable Integer userId) {
    try {
      List<InteractionDTO> list = interactionService.getInteractionsByUserAndAction(userId);
      return ResponseEntity.ok(successResponse(list, Messages.SUCCESS, "Saved items fetched"));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(errorResponse("Failed to fetch saves: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  @PostMapping("")
  public ResponseEntity<GlobalApiResponse<InteractionDTO>> saveResource(@RequestBody InteractionDTO req) {
    try {
      // Persist save interaction
      InteractionDTO saved = interactionService.logSave(req.getUserId(), req.getResourceType(), req.getResourceId());
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
