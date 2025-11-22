package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Recipe;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Integer>, JpaSpecificationExecutor<Recipe> {
    List<Recipe> findByAuthorId(Integer userId);

    Page<Recipe> findByAuthorId(Integer userId, Pageable pageable);
}
