package com.esewa.javabackend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDTO {
    private UUID id;
    private UUID userId;
    private String type;
    private String payload;
    private boolean isRead;
}
