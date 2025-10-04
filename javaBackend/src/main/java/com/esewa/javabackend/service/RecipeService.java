package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.RecipeDTO;
import com.esewa.javabackend.dto.Base.response.PaginatedDtoResponse;
import com.esewa.javabackend.mapper.RecipeMapper;
import com.esewa.javabackend.module.Recipe;
import com.esewa.javabackend.repository.JpaRepository.RecipeRepository;
import com.esewa.javabackend.utils.AppConstants;
import com.esewa.javabackend.utils.AppUtil;
import com.esewa.javabackend.utils.PaginatedResHandler;
import com.esewa.javabackend.utils.SearchFilter;
import com.esewa.javabackend.utils.specification.RecipeSpecification;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final RecipeMapper recipeMapper;
    private final String className = this.getClass().getName();

    // Create / Update
    public Integer saveRecipe(RecipeDTO recipeDTO) {
        log.info(className, AppUtil.getMethodName(), AppConstants.REQUEST, recipeDTO);

        Recipe recipe = Optional.ofNullable(recipeDTO.getId())
                .map(id -> recipeRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Recipe not found")))
                .orElse(new Recipe());

        recipeMapper.updateEntity(recipeDTO, recipe);
        return recipeRepository.save(recipe).getId();
    }

    public RecipeDTO getRecipeById(Integer id) {
        return recipeRepository.findById(id)
                .map(recipeMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found"));
    }

    public void deleteRecipe(Integer id) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe not found"));
        recipeRepository.delete(recipe);
    }

    public PaginatedDtoResponse<RecipeDTO> getAllRecipes(SearchFilter filter) {
        Pageable pageable = PageRequest.of(
                filter.getPagination().getPage(),
                filter.getPagination().getSize(),
                Sort.by(Sort.Direction.fromString(filter.getSortOrder()), filter.getSortBy())
        );

        Page<Recipe> recipes = recipeRepository.findAll(RecipeSpecification.buildSpecification(filter), pageable);
        Page<RecipeDTO> dtoPage = recipes.map(recipeMapper::toDTO);

        return PaginatedResHandler.getPaginatedData(dtoPage);
    }
}

