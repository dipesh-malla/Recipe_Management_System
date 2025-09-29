package com.esewa.javabackend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReactionDTO {
    private UUID id;
    private String resourceType;
    private UUID resourceId;
    private UUID userId;
    private String type;
}
