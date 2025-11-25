package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiRequest;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.RecipeCommentDTO;
import com.esewa.javabackend.dto.RecipeDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.FileStorageService;
import com.esewa.javabackend.service.RecipeCommentReactionService;
import com.esewa.javabackend.service.RecipeService;
import com.esewa.javabackend.utils.SearchFilter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/recipes")
public class RecipeController extends BaseController {

        private final RecipeService recipeService;
        private final RecipeCommentService commentService;
        private final FileStorageService fileStorageService;

        public RecipeController(RecipeService recipeService, RecipeCommentService commentService,
                        FileStorageService fileStorageService) {
                this.recipeService = recipeService;
                this.commentService = commentService;
                this.fileStorageService = fileStorageService;
        }

        // @PostMapping
        // public ResponseEntity<GlobalApiResponse<?>> createRecipe(@RequestBody
        // RecipeDTO recipeDTO) {
        // return ResponseEntity.ok(successResponse(
        // recipeService.saveRecipe(recipeDTO),
        // Messages.SUCCESS,
        // "Recipe saved"
        // ));
        // }

        @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public ResponseEntity<GlobalApiResponse<Integer>> saveRecipe(
                        @RequestPart("recipe") String recipeJson,
                        @RequestPart(value = "files", required = false) List<MultipartFile> files,
                        @RequestHeader(value = "X-User-Id", required = false) String xUserId,
                        @RequestParam(value = "authorId", required = false) Integer authorId) {
                try {
                        // Remove BOM if present (PowerShell/Windows may add a UTF-8 BOM)
                        if (recipeJson != null && recipeJson.length() > 0 && recipeJson.charAt(0) == '\uFEFF') {
                                recipeJson = recipeJson.substring(1);
                        }

                        ObjectMapper mapper = new ObjectMapper();
                        RecipeDTO recipeDTO = mapper.readValue(recipeJson, RecipeDTO.class);

                        // Resolve authorId from multiple sources if not present in JSON
                        if (recipeDTO.getAuthorId() == null || recipeDTO.getAuthorId() == 0) {
                                if (authorId != null) {
                                        recipeDTO.setAuthorId(authorId);
                                } else if (xUserId != null && !xUserId.isBlank()) {
                                        try {
                                                Integer parsed = Integer.valueOf(xUserId.trim());
                                                recipeDTO.setAuthorId(parsed);
                                        } catch (NumberFormatException ignored) {
                                        }
                                }
                        }

                        Integer createdId = recipeService.saveRecipeWithMedia(recipeDTO, files);
                        return ResponseEntity
                                        .ok(successResponse(createdId, Messages.SUCCESS, "Recipe saved successfully"));

                } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                        return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST)
                                        .body(errorResponse("Invalid recipe JSON: " + e.getOriginalMessage(),
                                                        org.springframework.http.HttpStatus.BAD_REQUEST));
                } catch (Exception e) {
                        return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                                        .body(errorResponse("Failed to save recipe: " + e.getMessage(),
                                                        org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR));
                }
        }

        @GetMapping("find/{id}")
        public ResponseEntity<GlobalApiResponse<?>> getRecipe(@PathVariable("id") Integer id) {
                return ResponseEntity.ok(successResponse(
                                recipeService.getRecipeById(id),
                                Messages.SUCCESS,
                                "Recipe fetched"));
        }

        @DeleteMapping("delete/{id}")
        public ResponseEntity<GlobalApiResponse<?>> deleteRecipe(@PathVariable Integer id) {
                recipeService.deleteRecipe(id);
                return ResponseEntity.ok(successResponse(
                                null,
                                Messages.SUCCESS,
                                "Recipe deleted"));
        }

        @GetMapping("/filter")
        public ResponseEntity<GlobalApiResponse<?>> getAllRecipes(
                        @RequestBody GlobalApiRequest<SearchFilter> filterReq) {
                return ResponseEntity.ok(successResponse(
                                recipeService.getAllRecipes(filterReq.getData()),
                                Messages.SUCCESS,
                                "Recipes fetched"));
        }

        @GetMapping("/cachedFiltered")
        public ResponseEntity<GlobalApiResponse<?>> getFilteredRecipesFromCache(
                        @RequestParam(defaultValue = "all") String cuisine,
                        @RequestParam(defaultValue = "all") String difficulty,
                        @RequestParam(required = false) Integer maxCookTime,
                        @RequestParam(defaultValue = "") String searchTerm,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "16") int size) {
                org.springframework.data.domain.Page<RecipeDTO> recipePage = recipeService.getFilteredRecipesFromCache(
                                cuisine, difficulty, maxCookTime,
                                searchTerm, page, size);

                Map<String, Object> payload = Map.of(
                                "content", recipePage.getContent(),
                                "totalElements", recipePage.getTotalElements(),
                                "totalPages", recipePage.getTotalPages(),
                                "pageNumber", recipePage.getNumber(),
                                "size", recipePage.getSize());

                return ResponseEntity.ok(successResponse(payload, Messages.SUCCESS, "Filtered recipes from cache"));
        }

        @PostMapping("/cacheAll")
        public ResponseEntity<GlobalApiResponse<?>> cacheAllRecipesToRedis() {
                recipeService.cacheAllRecipesToRedis();
                return ResponseEntity.ok(successResponse(null, Messages.SUCCESS, "All recipes cached to Redis"));
        }

        @GetMapping("/allRecipe")
        public ResponseEntity<GlobalApiResponse<?>> getAllRecipes(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "50") int size,
                        @RequestParam(defaultValue = "createdDate") String sortBy,
                        @RequestParam(defaultValue = "DESC") String sortOrder) {
                return ResponseEntity.ok(
                                successResponse(
                                                recipeService.findAllRecipesPaginated(page, size, sortBy, sortOrder),
                                                Messages.SUCCESS,
                                                "Recipes fetched"));
        }

        @GetMapping("/user/{userId}")
        public ResponseEntity<GlobalApiResponse<?>> getRecipeByUserId(
                        @PathVariable Integer userId,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
                Page<RecipeDTO> recipes = recipeService.getRecipesByUser(userId, page, size);
                return ResponseEntity.ok(successResponse(
                                recipes.getContent(),
                                Messages.SUCCESS,
                                "Recipes fetched"));
        }

        // Recipe comment api
        @PostMapping("/comments")
        public ResponseEntity<GlobalApiResponse<?>> addComment(@RequestBody RecipeCommentDTO recipeCommentDTO) {

                return ResponseEntity.ok(successResponse(
                                commentService.addComment(recipeCommentDTO),
                                Messages.SUCCESS,
                                "Comment added"));
        }

        @GetMapping("comment/{recipeId}")
        public ResponseEntity<GlobalApiResponse<?>> getRecipeCommentById(@PathVariable Integer recipeId) {
                return ResponseEntity.ok(
                                successResponse(
                                                commentService.getCommentsByRecipe(recipeId),
                                                Messages.SUCCESS,
                                                "Comment fetched"));
        }

}
