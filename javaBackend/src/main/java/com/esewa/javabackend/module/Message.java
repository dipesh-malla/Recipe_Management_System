package com.esewa.javabackend.module;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @ManyToOne(optional = false)
    @JoinColumn(name = "sender_id")
    private User sender;

    @Column(columnDefinition = "TEXT")
    private String body;

    @ElementCollection
    @CollectionTable(name = "message_media", joinColumns = @JoinColumn(name = "message_id"))
    @Column(name = "media_id")
    private List<UUID> mediaIds;

    @ElementCollection
    @CollectionTable(name = "message_read_by", joinColumns = @JoinColumn(name = "message_id"))
    @Column(name = "user_id")
    private List<UUID> readBy;

    @CreationTimestamp
    private Instant createdAt;
}

