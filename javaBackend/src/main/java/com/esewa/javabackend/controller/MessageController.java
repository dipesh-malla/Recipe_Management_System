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
    public ResponseEntity<MessageDTO> sendMessage(@RequestParam Integer senderId,
                                               @RequestParam Integer receiverId,
                                               @RequestParam String body) {
        return ResponseEntity.ok(messageService.sendMessage(senderId, receiverId, body));
    }

    @GetMapping("/chat")
    public ResponseEntity<List<MessageDTO>> getChat(@RequestBody ChatDTO  chatDTO) {
        return ResponseEntity.ok(messageService.getMessagesBetweenUsers(chatDTO.getUser1Id(), chatDTO.getUser2Id()));
    }

    @GetMapping("/conversations/{userId}")
    public ResponseEntity<List<ConversationPreviewDTO>> getUserInbox(@PathVariable Integer userId) {
        return ResponseEntity.ok(messageService.getUserConversations(userId));
    }

    @PostMapping("/read/{conversationId}/{userId}")
    public ResponseEntity<Void> markMessagesAsRead(@PathVariable Integer conversationId,
                                                   @PathVariable Integer userId) {
        messageService.markMessagesAsRead(conversationId, userId);
        return ResponseEntity.ok().build();
    }
}

