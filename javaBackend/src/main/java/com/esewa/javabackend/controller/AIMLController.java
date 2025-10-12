package com.esewa.javabackend.controller;


import com.esewa.javabackend.dto.InteractionDTO;
import com.esewa.javabackend.enums.*;
import com.esewa.javabackend.module.AIML.Embedding;
import com.esewa.javabackend.module.AIML.Interaction;
import com.esewa.javabackend.service.AIML.EmbeddingService;
import com.esewa.javabackend.service.AIML.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Unified controller for AI/ML data collection and embedding management.
 * Handles:
 *  - Logging user interactions
 *  - Managing vector embeddings for recipes, posts, and users
 */
@RestController
@RequestMapping("/api/aiml")
@RequiredArgsConstructor
public class AIMLController {

    private final InteractionService interactionService;
    private final EmbeddingService embeddingService;


    /**
     * Log a user interaction with a post or recipe (view, like, save, comment, etc.)
     */
    @PostMapping("/interactions")
    public ResponseEntity<InteractionDTO> logInteraction(
            @RequestBody InteractionDTO interactionDTO
            ) {

         interactionService.logInteraction(interactionDTO.getUserId(), interactionDTO.getResourceType(), interactionDTO.getResourceId(), interactionDTO.getAction(),interactionDTO.getValue());
        return ResponseEntity.ok(interactionService.logInteraction(
                interactionDTO.getUserId(),
                interactionDTO.getResourceType(),
                interactionDTO.getResourceId(),
                interactionDTO.getAction(),
                interactionDTO.getValue()));

    }

    @GetMapping("/getAllInteraction")
    public ResponseEntity<List<InteractionDTO>> getAllInteraction() {
        return ResponseEntity.ok(interactionService.allInteraction());
    }

    /**
     * Get all interactions for a user (optional — for debugging or analytics)
     */
//    @GetMapping("/interactions/{userId}")
//    public ResponseEntity<List<Interaction>> getInteractionsByUser(@PathVariable Integer userId) {
//        return ResponseEntity.ok(interactionService.getInteractionsByUser(userId));
//    }


    /**
     * Create or update an embedding for a given object (recipe, post, or user)
     * Called by your Python AI microservice after generating embeddings.
     */
    @PostMapping("/embeddings")
    public ResponseEntity<Embedding> createOrUpdateEmbedding(
            @RequestParam ObjectType objectType,
            @RequestParam Integer objectId,
            @RequestParam String modelVersion,
            @RequestBody float[] vector) {

        Embedding saved = embeddingService.saveOrUpdateEmbedding(objectType, objectId, vector, modelVersion);
        return ResponseEntity.ok(saved);
    }

    /**
     * Get embedding for a single object (e.g., one recipe)
     */
    @GetMapping("/embeddings/{objectType}/{objectId}")
    public ResponseEntity<Embedding> getEmbedding(
            @PathVariable ObjectType objectType,
            @PathVariable Integer objectId) {

        Embedding embedding = embeddingService.getEmbedding(objectType, objectId);
        return embedding != null ? ResponseEntity.ok(embedding) : ResponseEntity.notFound().build();
    }

    /**
     * Get all embeddings of a given type (e.g., all recipes)
     */
    @GetMapping("/embeddings/{objectType}")
    public ResponseEntity<List<Embedding>> getAllByType(@PathVariable ObjectType objectType) {
        return ResponseEntity.ok(embeddingService.getAllByType(objectType));
    }
}

