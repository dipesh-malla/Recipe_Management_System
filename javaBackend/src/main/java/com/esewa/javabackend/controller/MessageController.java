package com.esewa.javabackend.controller;

import com.esewa.javabackend.dto.ChatDTO;
import com.esewa.javabackend.dto.ConversationPreviewDTO;
import com.esewa.javabackend.dto.MessageDTO;
import com.esewa.javabackend.module.Message;
import com.esewa.javabackend.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping("/send")
    public ResponseEntity<MessageDTO> sendMessage(
            @RequestHeader(value = "X-User-Id", required = false) Integer headerUserId,
            @RequestBody(required = false) MessageDTO payload,
            @RequestParam(value = "receiverId", required = false) Integer receiverIdParam,
            @RequestParam(value = "body", required = false) String bodyParam) {
        // Determine senderId: prefer X-User-Id header, then payload.senderId
        Integer senderId = headerUserId != null ? headerUserId : (payload != null ? payload.getSenderId() : null);
        Integer receiverId = receiverIdParam != null ? receiverIdParam
                : (payload != null ? payload.getReceiverId() : null);
        String body = bodyParam != null ? bodyParam : (payload != null ? payload.getBody() : null);

        if (senderId == null || receiverId == null || body == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(messageService.sendMessage(senderId, receiverId, body));
    }

    // Frontend expects GET /api/messages/{otherUserId} to fetch chat messages with
    // the current user
    @GetMapping("/{otherUserId}")
    public ResponseEntity<List<MessageDTO>> getChatWithUser(
            @RequestHeader(value = "X-User-Id", required = false) Integer headerUserId,
            @PathVariable Integer otherUserId) {
        Integer currentUserId = headerUserId;
        if (currentUserId == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(messageService.getMessagesBetweenUsers(currentUserId, otherUserId));
    }

    @GetMapping("/conversations/{userId}")
    public ResponseEntity<List<ConversationPreviewDTO>> getUserInbox(@PathVariable Integer userId) {
        return ResponseEntity.ok(messageService.getUserConversations(userId));
    }

    // Frontend calls PUT /api/messages/read/{otherUserId} with X-User-Id header set
    // to current user
    @PutMapping("/read/{otherUserId}")
    public ResponseEntity<Void> markMessagesAsRead(
            @RequestHeader(value = "X-User-Id", required = false) Integer headerUserId,
            @PathVariable Integer otherUserId) {
        Integer currentUserId = headerUserId;
        if (currentUserId == null)
            return ResponseEntity.badRequest().build();
        messageService.markMessagesBetweenUsersAsRead(currentUserId, otherUserId);
        return ResponseEntity.ok().build();
    }
}
