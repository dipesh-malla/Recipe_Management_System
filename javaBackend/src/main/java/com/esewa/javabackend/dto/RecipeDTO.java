package com.esewa.javabackend.dto;

import lombok.*;

import java.util.List;
import java.time.LocalDateTime;

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
    private String instructions;
    private List<String> ingredients;
    private Integer servings;
    private Integer cookTime; // minutes
    private String cuisine;
    private boolean isPublic;
    private List<String> tags;
    private List<Integer> mediaIds;
    private String moderationStatus;

    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;
}


