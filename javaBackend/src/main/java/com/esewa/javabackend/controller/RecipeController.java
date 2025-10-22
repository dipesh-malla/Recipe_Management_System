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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recipes")
public class RecipeController extends BaseController {

    private final RecipeService recipeService;
    private final FileStorageService  fileStorageService;


    public RecipeController(RecipeService recipeService, RecipeCommentReactionService commentService, FileStorageService fileStorageService) {
        this.recipeService = recipeService;
        this.fileStorageService = fileStorageService;
    }

//    @PostMapping
//    public ResponseEntity<GlobalApiResponse<?>> createRecipe(@RequestBody RecipeDTO recipeDTO) {
//        return ResponseEntity.ok(successResponse(
//                recipeService.saveRecipe(recipeDTO),
//                Messages.SUCCESS,
//                "Recipe saved"
//        ));
//    }


    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GlobalApiResponse<Integer>> saveRecipe(
            @RequestPart("recipe") String recipeJson,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) throws JsonProcessingException {

        RecipeDTO recipeDTO = new ObjectMapper().readValue(recipeJson, RecipeDTO.class);

        return ResponseEntity.ok(
                successResponse(
                        recipeService.saveRecipeWithMedia(recipeDTO, files),
                        Messages.SUCCESS,
                        "Recipe saved successfully"
                )
        );
    }




    @GetMapping("find/{id}")
    public ResponseEntity<GlobalApiResponse<?>> getRecipe(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(successResponse(
                recipeService.getRecipeById(id),
                Messages.SUCCESS,
                "Recipe fetched"
        ));
    }

    @DeleteMapping("delete/{id}")
    public ResponseEntity<GlobalApiResponse<?>> deleteRecipe(@PathVariable Integer id) {
        recipeService.deleteRecipe(id);
        return ResponseEntity.ok(successResponse(
                null,
                Messages.SUCCESS,
                "Recipe deleted"
        ));
    }

    @GetMapping("/filter")
    public ResponseEntity<GlobalApiResponse<?>> getAllRecipes(
            @RequestBody GlobalApiRequest<SearchFilter> filterReq) {
        return ResponseEntity.ok(successResponse(
                recipeService.getAllRecipes(filterReq.getData()),
                Messages.SUCCESS,
                "Recipes fetched"
        ));
    }

    @GetMapping("/allRecipe")
    public ResponseEntity<GlobalApiResponse<?>> getAllRecipes() {
        return ResponseEntity.ok(
                successResponse(
                        recipeService.findAllRecipes(),
                        Messages.SUCCESS,
                        "Recipes fetched"
                )
        );
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<GlobalApiResponse<?>> getRecipeByUserId(@PathVariable Integer userId) {
        return ResponseEntity.ok(successResponse(
                recipeService.getRecipesByUser(userId),
                Messages.SUCCESS,
                "Recipe fetched"
        ));
    }



//    Recipe comment api


}
