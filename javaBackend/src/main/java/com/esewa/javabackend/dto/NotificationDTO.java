package com.esewa.javabackend.dto;


import com.esewa.javabackend.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private Integer id;

    private Integer senderId;
    private String senderUsername;

    private Integer receiverId;
    private String receiverUsername;

    private NotificationType type;

    private String message;

    private Integer referenceId; // e.g., postId, followeeId, commentId

    private boolean isRead;

    private LocalDateTime createdDate;
}

