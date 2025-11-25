package com.esewa.javabackend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class IngredientDTO {
    private Integer id;

    @JsonAlias({ "name", "ingredientName" })
    private String ingredientName;

    @JsonAlias({ "description", "ingredientDescription" })
    private String ingredientDescription;
}