package com.esewa.javabackend.config.kafka;


import com.esewa.javabackend.dto.event.NotificationEvent;
import com.esewa.javabackend.module.Notification;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.NotificationRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @KafkaListener(
            topics = "notifications",
            groupId = "notification-group",
            containerFactory = "notificationKafkaListenerContainerFactory"
    )
    public void consume(NotificationEvent event) {
        User sender = userRepository.findById(event.getSenderId())
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = userRepository.findById(event.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        Notification notification = Notification.builder()
                .sender(sender)
                .receiver(receiver)
                .type(event.getType())
                .message(event.getMessage())
                .referenceId(event.getReferenceId())
                .isRead(false)
                .build();

        notificationRepository.save(notification);}
}

