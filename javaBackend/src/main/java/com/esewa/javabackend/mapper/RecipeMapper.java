package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.*;
import com.esewa.javabackend.module.*;
import org.mapstruct.*;
import java.util.List;

@Mapper(componentModel = "spring")
public interface RecipeMapper {

    // --- RecipeDTO → Recipe (new entity) ---
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "author", ignore = true) // set manually in service
    @Mapping(target = "instructions", ignore = true) // set manually
    @Mapping(target = "ingredients", ignore = true) // set manually
    @Mapping(target = "tags", ignore = true) // set manually
    @Mapping(target = "media", ignore = true) // set manually
    @Mapping(target = "comments", ignore = true)
    Recipe toEntity(RecipeDTO dto);

    // --- Update existing Recipe from DTO ---
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "author", ignore = true)
    @Mapping(target = "instructions", ignore = true)
    @Mapping(target = "ingredients", ignore = true)
    @Mapping(target = "tags", ignore = true)
    @Mapping(target = "media", ignore = true)
    @Mapping(target = "comments", ignore = true)
    void updateEntity(RecipeDTO dto, @MappingTarget Recipe recipe);

    // --- Recipe → RecipeDTO ---
    @Mapping(source = "author.id", target = "authorId")
    RecipeDTO toDTO(Recipe recipe);

    // --- Instructions mapping ---
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "recipe", ignore = true) // set manually in service
    Instruction toInstructionEntity(InstructionDTO dto);

    InstructionDTO toInstructionDTO(Instruction entity);

    List<Instruction> mapInstructions(List<InstructionDTO> dtos);

    List<InstructionDTO> mapInstructionsDTO(List<Instruction> entities);

    // --- Ingredients mapping ---
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "recipe", ignore = true) // set manually in service
    Ingredients toIngredientEntity(IngredientDTO dto);

    IngredientDTO toIngredientDTO(Ingredients entity);

    List<Ingredients> mapIngredients(List<IngredientDTO> dtos);

    List<IngredientDTO> mapIngredientsDTO(List<Ingredients> entities);
}
