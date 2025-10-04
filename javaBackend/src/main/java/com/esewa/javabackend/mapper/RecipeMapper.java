package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.RecipeDTO;
import com.esewa.javabackend.module.Recipe;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface RecipeMapper {

    @Mapping(source = "author.id", target = "authorId")
    RecipeDTO toDTO(Recipe recipe);

    @Mapping(source = "authorId", target = "author.id")
    Recipe toEntity(RecipeDTO dto);

    // Partial update: only overwrite non-null fields
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(RecipeDTO dto, @MappingTarget Recipe entity);
}

