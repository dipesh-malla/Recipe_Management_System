package com.esewa.javabackend.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeDTO {
    private UUID id;
    private UUID authorId;
    private String title;
    private String description;
    private String instructions;
    private List<String> tags;
    private Integer cookTime;
    private Integer servings;
    private String cuisine;
    private boolean isPublic;
}


