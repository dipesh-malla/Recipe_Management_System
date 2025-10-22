package com.esewa.javabackend.controller;

import com.esewa.javabackend.dto.InteractionDTO;
import com.esewa.javabackend.dto.RecipeDTO;
import com.esewa.javabackend.dto.UserDTO.FollowDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.dto.aiml.AIMLDataDTO;
import com.esewa.javabackend.dto.postDTO.PostResponseDTO;
import com.esewa.javabackend.service.*;
import com.esewa.javabackend.service.AIML.AIMLService;
import com.esewa.javabackend.service.AIML.EmbeddingService;
import com.esewa.javabackend.service.AIML.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final AIMLService aiMLService;

    @GetMapping("/dataset")
    public ResponseEntity<AIMLDataDTO> getFullDataset() {

        AIMLDataDTO dataset = AIMLDataDTO.builder()
                .users(userService.getAllUsers().stream()
                        .filter(UserResponseDTO::isNew)
                        .toList())
                .posts(postService.fetchAllPosts().stream()
                        .filter(PostResponseDTO::isNew)
                        .toList())
                .recipes(recipeService.findAllRecipes().stream()
                        .filter(RecipeDTO::isNew)
                        .toList())
                .interactions(interactionService.allInteraction().stream()
                        .filter(InteractionDTO::isNew)
                        .toList())
                .follows(followService.getAllFollows().stream()
                        .filter(FollowDTO::isNew)
                        .toList())
                .embeddings(embeddingService.getAllEmbeddings())
                .build();

        aiMLService.markDatasetAsTrained(dataset);

        return ResponseEntity.ok(dataset);
    }

}
