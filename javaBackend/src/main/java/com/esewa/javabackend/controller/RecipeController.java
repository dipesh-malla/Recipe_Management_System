package com.esewa.javabackend.controller;

import com.esewa.javabackend.controller.Base.BaseController;
import com.esewa.javabackend.dto.Base.GlobalApiRequest;
import com.esewa.javabackend.dto.Base.GlobalApiResponse;
import com.esewa.javabackend.dto.RecipeDTO;
import com.esewa.javabackend.enums.Messages;
import com.esewa.javabackend.service.RecipeService;
import com.esewa.javabackend.utils.SearchFilter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/recipes")
public class RecipeController extends BaseController {

    private final RecipeService recipeService;
    public RecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }

    @PostMapping
    public ResponseEntity<GlobalApiResponse<?>> saveRecipe(@RequestBody RecipeDTO recipeDTO) {
        return ResponseEntity.ok(successResponse(
                recipeService.saveRecipe(recipeDTO),
                Messages.SUCCESS,
                "Recipe saved"
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<?>> getRecipe(@PathVariable Integer id) {
        return ResponseEntity.ok(successResponse(
                recipeService.getRecipeById(id),
                Messages.SUCCESS,
                "Recipe fetched"
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GlobalApiResponse<?>> deleteRecipe(@PathVariable Integer id) {
        recipeService.deleteRecipe(id);
        return ResponseEntity.ok(successResponse(
                null,
                Messages.SUCCESS,
                "Recipe deleted"
        ));
    }

    @PostMapping("/filter")
    public ResponseEntity<GlobalApiResponse<?>> getAllRecipes(
            @RequestBody GlobalApiRequest<SearchFilter> filterReq) {
        return ResponseEntity.ok(successResponse(
                recipeService.getAllRecipes(filterReq.getData()),
                Messages.SUCCESS,
                "Recipes fetched"
        ));
    }
}
