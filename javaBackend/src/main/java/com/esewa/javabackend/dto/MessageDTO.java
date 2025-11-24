package com.esewa.javabackend.dto;

import lombok.*;


import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDTO {
    private Integer id;
    private Integer conversationId;
    private Integer senderId;
    private String senderName;
    private Integer receiverId;
    private String body;
    private Instant sentAt;
    private boolean isRead;
}



