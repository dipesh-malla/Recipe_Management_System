package com.esewa.javabackend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeReactionDTO {
    private Integer id;
    private Integer recipeId;
    private Integer userId;
    private String type;
}
