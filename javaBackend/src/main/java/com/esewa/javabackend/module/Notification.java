package com.esewa.javabackend.module;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    private String type;

    @Column(columnDefinition = "jsonb")
    private String payload; // JSON data for flexibility

    private boolean isRead = false;

    @CreationTimestamp
    private Instant createdAt;
}

