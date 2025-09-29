package com.esewa.javabackend.module;


import jakarta.persistence.*;
import lombok.*;
import org.apache.kafka.common.resource.ResourceType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Comment parent; // nullable for root-level comment

    @Enumerated(EnumType.STRING)
    private ResourceType resourceType;

    private UUID resourceId; // ID of Post or Recipe

    @ManyToOne(optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(columnDefinition = "TEXT")
    private String body;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant editedAt;

    private boolean deletedFlag = false;
}

