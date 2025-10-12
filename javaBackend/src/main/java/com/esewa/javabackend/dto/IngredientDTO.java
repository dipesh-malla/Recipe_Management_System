package com.esewa.javabackend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientDTO {
    private Integer id;
    private String ingredientName;
    private String ingredientDescription;
}