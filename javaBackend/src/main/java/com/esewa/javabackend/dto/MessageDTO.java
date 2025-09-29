package com.esewa.javabackend.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDTO {
    private UUID id;
    private UUID conversationId;
    private UUID senderId;
    private String body;
    private List<UUID> mediaIds;
}
