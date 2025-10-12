package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.RecipeComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecipeCommentRepository extends JpaRepository<RecipeComment, Integer> {
    List<RecipeComment> findByRecipeIdAndParentIsNull(Integer recipeId);
}
