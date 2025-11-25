package com.esewa.javabackend.service;

import com.esewa.javabackend.dto.NotificationDTO;
import com.esewa.javabackend.module.Notification;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.NotificationRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

        private final NotificationRepository notificationRepository;
        private final UserRepository userRepository;

        public List<NotificationDTO> getNotificationsByUser(Integer userId) {
                java.util.Optional<User> maybeUser = userRepository.findById(userId);
                if (!maybeUser.isPresent()) {
                        return java.util.Collections.emptyList();
                }

                List<Notification> notifications = notificationRepository
                                .findByReceiverOrderByCreatedDateDesc(maybeUser.get());

                return notifications.stream()
                                .map(n -> NotificationDTO.builder()
                                                .id(n.getId())
                                                .senderId(n.getSender() != null ? n.getSender().getId() : null)
                                                .senderUsername(n.getSender() != null ? n.getSender().getUsername()
                                                                : null)
                                                .receiverId(n.getReceiver() != null ? n.getReceiver().getId() : null)
                                                .receiverUsername(
                                                                n.getReceiver() != null ? n.getReceiver().getUsername()
                                                                                : null)
                                                .type(n.getType())
                                                .message(n.getMessage())
                                                .referenceId(n.getReferenceId())
                                                .isRead(n.getIsRead())
                                                .createdDate(n.getCreatedDate())
                                                .build())
                                .collect(java.util.stream.Collectors.toList());
        }

        public List<NotificationDTO> getUnreadNotifications(Integer userId) {
                java.util.Optional<User> maybeUser = userRepository.findById(userId);
                if (!maybeUser.isPresent()) {
                        return java.util.Collections.emptyList();
                }

                return notificationRepository
                                .findByReceiverAndIsReadFalseOrderByCreatedDateDesc(maybeUser.get())
                                .stream()
                                .map(n -> NotificationDTO.builder()
                                                .id(n.getId())
                                                .senderId(n.getSender() != null ? n.getSender().getId() : null)
                                                .senderUsername(n.getSender() != null ? n.getSender().getUsername()
                                                                : null)
                                                .receiverId(n.getReceiver() != null ? n.getReceiver().getId() : null)
                                                .receiverUsername(
                                                                n.getReceiver() != null ? n.getReceiver().getUsername()
                                                                                : null)
                                                .type(n.getType())
                                                .message(n.getMessage())
                                                .referenceId(n.getReferenceId())
                                                .isRead(n.getIsRead())
                                                .createdDate(n.getCreatedDate())
                                                .build())
                                .collect(java.util.stream.Collectors.toList());
        }

        @Transactional
        public void markAsRead(Integer notificationId) {
                Notification notification = notificationRepository.findById(notificationId)
                                .orElseThrow(() -> new RuntimeException("Notification not found"));
                notification.setIsRead(true);
                notificationRepository.save(notification);
        }

        @Transactional
        public void markAllAsRead(Integer userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                List<Notification> notifications = notificationRepository
                                .findByReceiverAndIsReadFalseOrderByCreatedDateDesc(user);
                notifications.forEach(n -> n.setIsRead(true));
                notificationRepository.saveAll(notifications);
        }

        @Transactional
        public List<NotificationDTO> allNotifications() {
                return notificationRepository.findAll().stream().map(n -> NotificationDTO.builder()
                                .id(n.getId())
                                .senderId(n.getSender().getId())
                                .senderUsername(n.getSender().getUsername())
                                .receiverId(n.getReceiver().getId())
                                .receiverUsername(n.getReceiver().getUsername())
                                .type(n.getType())
                                .message(n.getMessage())
                                .referenceId(n.getReferenceId())
                                .isRead(n.getIsRead())
                                .createdDate(n.getCreatedDate())
                                .build())
                                .toList();
        }
}
