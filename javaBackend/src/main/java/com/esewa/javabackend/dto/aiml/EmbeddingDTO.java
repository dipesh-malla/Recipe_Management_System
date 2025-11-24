package com.esewa.javabackend.dto.aiml;


import com.esewa.javabackend.enums.ObjectType;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmbeddingDTO {
    private Integer id;
    private ObjectType objectType;   // POST, RECIPE, USER, etc.
    private Integer objectId;        // The linked entity's ID
    private float[] vector;          // Embedding vector
    private String modelVersion;
    private Instant createdAt;
}