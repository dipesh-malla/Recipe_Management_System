package com.esewa.javabackend.dto;

import com.esewa.javabackend.module.Ingredients;
import com.esewa.javabackend.module.Tag;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeDTO {
    private Integer id;
    private Integer authorId;
    private String title;
    private String description;
    private List<InstructionDTO> instructions;
    private List<IngredientDTO> ingredients;
    private String dietaryType;
    private List<TagDTO> tags;
    private String cuisine;
    private Integer servings;
    private Integer cookTime;
    private Integer prepTime;
    @JsonProperty("isPublic")
    private boolean isPublic;
    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;
    private List<MediaDTO> media;
    private String difficulty;
    // Dynamic fields for frontend
    private String authorName;
    private int reactionsCount;
    private int commentsCount;
}
