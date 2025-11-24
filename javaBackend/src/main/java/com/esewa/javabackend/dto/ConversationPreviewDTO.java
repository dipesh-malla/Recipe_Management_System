package com.esewa.javabackend.dto;


import lombok.*;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationPreviewDTO {
    private Integer conversationId;
    private Integer otherUserId;
    private String otherUserName;
    private String lastMessage;
    private Instant lastMessageTime;
    private long unreadCount;
}
