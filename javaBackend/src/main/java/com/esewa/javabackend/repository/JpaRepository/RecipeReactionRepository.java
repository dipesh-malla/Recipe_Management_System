package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Reaction;
import com.esewa.javabackend.module.RecipeReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RecipeReactionRepository extends JpaRepository<RecipeReaction, Integer> {
    Optional<RecipeReaction> findByRecipeIdAndUserId(Integer recipeId, Integer userId);
}
