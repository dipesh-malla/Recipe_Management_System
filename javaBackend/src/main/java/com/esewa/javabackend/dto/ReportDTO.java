package com.esewa.javabackend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportDTO {
    private UUID id;
    private UUID reporterId;
    private String targetType;
    private UUID targetId;
    private String reason;
    private String status;
}
