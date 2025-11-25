package com.esewa.javabackend.service;

import com.esewa.javabackend.config.kafka.NotificationProducer;
import com.esewa.javabackend.dto.ConversationPreviewDTO;
import com.esewa.javabackend.dto.MessageDTO;
import com.esewa.javabackend.dto.event.InteractionEvent;
import com.esewa.javabackend.dto.event.NotificationEvent;
import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.NotificationType;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.module.Conversation;
import com.esewa.javabackend.module.Message;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.ConversationRepository;
import com.esewa.javabackend.repository.JpaRepository.MessageRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MessageService {

        private final MessageRepository messageRepository;
        private final ConversationRepository conversationRepository;
        private final FollowService followService;
        private final UserRepository userRepository;
        private final NotificationProducer notificationProducer;

        @Transactional
        public MessageDTO sendMessage(Integer senderId, Integer receiverId, String body) {
                // Allow messaging when:
                // - a conversation between the users already exists, OR
                // - the sender is following the receiver (one-way follow).
                // This makes it possible to message users you follow without requiring mutual
                // follow.
                boolean conversationExists = conversationRepository.findBetweenUsers(senderId, receiverId).isPresent();
                if (!conversationExists && !followService.isFollowing(senderId, receiverId)) {
                        throw new IllegalStateException(
                                        "You can only message users you follow or with whom you already have a conversation.");
                }
                User sender = userRepository.findById(senderId)
                                .orElseThrow(() -> new RuntimeException("Sender not found"));
                User receiver = userRepository.findById(receiverId)
                                .orElseThrow(() -> new RuntimeException("Receiver not found"));

                Conversation conversation = conversationRepository
                                .findBetweenUsers(senderId, receiverId)
                                .orElseGet(() -> {
                                        Conversation conv = Conversation.builder()
                                                        .participants(List.of(sender, receiver))
                                                        .build();
                                        return conversationRepository.save(conv);
                                });

                Message message = Message.builder()
                                .conversation(conversation)
                                .sender(sender)
                                .body(body)
                                .readBy(List.of(senderId))
                                .sentAt(Instant.now())
                                .build();

                Message savedMessage = messageRepository.save(message);

                // Send notification asynchronously; failures here must not block message send.
                try {
                        notificationProducer.sendNotification(NotificationEvent.builder()
                                        .senderId(sender.getId())
                                        .receiverId(receiver.getId())
                                        .type(NotificationType.MESSAGE)
                                        .message(sender.getUsername() + " sent you a message")
                                        .referenceId(conversation.getId())
                                        .build());
                } catch (Exception ex) {
                        // Log and continue — Kafka may be unavailable in local/dev environments
                        System.err.println("MessageService: failed to send notification: " + ex.getMessage());
                }

                return MessageDTO.builder()
                                .id(savedMessage.getId())
                                .senderId(sender.getId())
                                .senderName(sender.getUsername())
                                .receiverId(receiver.getId())
                                .body(savedMessage.getBody())
                                .sentAt(savedMessage.getSentAt())
                                .isRead(false)
                                .conversationId(conversation.getId())
                                .build();
        }

        @Transactional
        public List<MessageDTO> getMessagesBetweenUsers(Integer user1Id, Integer user2Id) {
                var maybeConversation = conversationRepository.findBetweenUsers(user1Id, user2Id);
                if (maybeConversation.isEmpty()) {
                        // No conversation yet — return empty list instead of throwing so frontend can
                        // handle gracefully
                        return List.of();
                }

                Conversation conversation = maybeConversation.get();
                List<Message> messages = messageRepository.findAllByConversationId(conversation.getId());

                return messages.stream()
                                .map(m -> {
                                        boolean isRead = false;
                                        if (m.getReadBy() != null) {
                                                isRead = m.getReadBy().contains(user1Id);
                                        }
                                        return MessageDTO.builder()
                                                        .id(m.getId())
                                                        .conversationId(conversation.getId())
                                                        .senderId(m.getSender() != null ? m.getSender().getId() : null)
                                                        .senderName(m.getSender() != null ? m.getSender().getUsername()
                                                                        : null)
                                                        .body(m.getBody())
                                                        .sentAt(m.getSentAt())
                                                        .isRead(isRead)
                                                        .build();
                                })
                                .toList();
        }

        @Transactional
        public List<ConversationPreviewDTO> getUserConversations(Integer userId) {
                User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

                List<Conversation> conversations = conversationRepository.findAllByUser(user);
                List<ConversationPreviewDTO> previews = new ArrayList<>();

                for (Conversation conv : conversations) {
                        Message lastMessage = messageRepository.findLastMessageByConversationId(conv.getId())
                                        .orElse(null);
                        long unreadCount = messageRepository.countUnreadMessages(conv.getId(), userId);

                        // find the other participant
                        User other = conv.getParticipants().stream()
                                        .filter(u -> !u.getId().equals(userId))
                                        .findFirst()
                                        .orElse(null);

                        if (other == null)
                                continue;

                        previews.add(ConversationPreviewDTO.builder()
                                        .conversationId(conv.getId())
                                        .otherUserId(other.getId())
                                        .otherUserName(other.getUsername())
                                        .lastMessage(lastMessage != null ? lastMessage.getBody() : "")
                                        .lastMessageTime(lastMessage != null ? lastMessage.getSentAt() : null)
                                        .unreadCount(unreadCount)
                                        .build());
                }

                // sort by last message time (latest first)
                previews.sort(Comparator.comparing(ConversationPreviewDTO::getLastMessageTime,
                                Comparator.nullsLast(Comparator.reverseOrder())));

                return previews;
        }

        @Transactional
        public void markMessagesAsRead(Integer conversationId, Integer userId) {
                List<Message> messages = messageRepository.findAllByConversationId(conversationId);
                for (Message m : messages) {
                        if (m.getReadBy() == null) {
                                m.setReadBy(new java.util.ArrayList<>());
                        }
                        if (!m.getReadBy().contains(userId)) {
                                m.getReadBy().add(userId);
                        }
                }
                messageRepository.saveAll(messages);
        }

        @Transactional
        public void markMessagesBetweenUsersAsRead(Integer currentUserId, Integer otherUserId) {
                // Find conversation between users
                Conversation conv = conversationRepository.findBetweenUsers(currentUserId, otherUserId)
                                .orElse(null);
                if (conv == null)
                        return;
                markMessagesAsRead(conv.getId(), currentUserId);
        }
}
