package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.RecipeCommentDTO;
import com.esewa.javabackend.module.RecipeComment;
import org.mapstruct.*;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface RecipeCommentMapper {

    // --- Entity to DTO ---
    @Mapping(source = "author.id", target = "authorId")
    @Mapping(source = "recipe.id", target = "recipeId")
    @Mapping(source = "parent.id", target = "parentId")
    RecipeCommentDTO toDTO(RecipeComment comment);

    // --- DTO to Entity ---
    @Mapping(source = "authorId", target = "author.id")
    @Mapping(source = "recipeId", target = "recipe.id")
//    @Mapping(source = "parentId", target = "parent.id")
    RecipeComment toEntity(RecipeCommentDTO dto);

    // --- Mapping collections ---
    default Set<RecipeCommentDTO> toDTOList(Set<RecipeComment> comments) {
        return comments.stream().map(this::toDTO).collect(Collectors.toSet());
    }

}
