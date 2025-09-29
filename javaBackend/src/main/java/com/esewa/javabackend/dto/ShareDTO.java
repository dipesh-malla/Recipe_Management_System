package com.esewa.javabackend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShareDTO {
    private UUID id;
    private UUID userId;
    private String resourceType;
    private UUID resourceId;
    private String shareText;
}
