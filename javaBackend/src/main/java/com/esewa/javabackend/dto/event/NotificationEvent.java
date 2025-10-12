package com.esewa.javabackend.dto.event;

import com.esewa.javabackend.enums.NotificationType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationEvent {
    private Integer senderId;
    private Integer receiverId;
    private NotificationType type;
    private String message;
    private Integer referenceId;
}
