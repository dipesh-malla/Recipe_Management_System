package com.esewa.javabackend.controller;

import com.esewa.javabackend.dto.aiml.AIMLDataDTO;
import com.esewa.javabackend.service.*;
import com.esewa.javabackend.service.AIML.EmbeddingService;
import com.esewa.javabackend.service.AIML.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/aiml")
@RequiredArgsConstructor
public class AIMLDataController {

    private final UserService userService;
    private final PostService postService;
    private final RecipeService recipeService;
    private final InteractionService interactionService;
    private final FollowService followService;
    private final EmbeddingService embeddingService;

    @GetMapping("/dataset")
    public ResponseEntity<AIMLDataDTO> getFullDataset() {
        AIMLDataDTO dataset = AIMLDataDTO.builder()
                .users(userService.getAllUsers())
                .posts(postService.fetchAllPosts())
                .recipes(recipeService.findAllRecipes())
                .interactions(interactionService.allInteraction())
                .follows(followService.getAllFollows())
                .embeddings(embeddingService.getAllEmbeddings())
                .build();

        return ResponseEntity.ok(dataset);
    }
}
