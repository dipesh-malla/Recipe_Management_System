package com.esewa.javabackend.dto;

import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDTO {
    private Integer id;
    private Integer authorId;
    private Integer parentId;
    private String body;
    private String authorName;
    private boolean deletedFlag;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private Integer postId;
    private Set<CommentDTO> replies;
}
