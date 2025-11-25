package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface ReactionRepository extends JpaRepository<Reaction, Integer> {
    Optional<Reaction> findByPostIdAndUserId(Integer postId, Integer userId);

    Optional<Reaction> findByRecipeIdAndUserId(Integer recipeId, Integer userId);

    // New method to count reactions for a given recipe
    int countByRecipeId(Integer recipeId);

    // Optionally, fetch all reactions for a recipe
    List<Reaction> findByRecipeId(Integer recipeId);
}
