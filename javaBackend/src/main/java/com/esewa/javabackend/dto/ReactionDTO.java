package com.esewa.javabackend.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReactionDTO {
    private Integer id;
    private Integer postId;
    private Integer userId;
    private String type;
}
