package com.esewa.javabackend.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeCommentDTO {
    private Integer id;
    private Integer authorId;
    private Integer recipeId;
    private Integer parentId;
    private String body;
    private LocalDateTime createdDate;
    private Set<RecipeCommentDTO> replies = new HashSet<>();
}
