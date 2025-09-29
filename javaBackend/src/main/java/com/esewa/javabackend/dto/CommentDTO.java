package com.esewa.javabackend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDTO {
    private UUID id;
    private UUID parentId;
    private String resourceType;
    private UUID resourceId;
    private UUID authorId;
    private String body;
}
