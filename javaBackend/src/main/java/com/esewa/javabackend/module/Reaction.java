package com.esewa.javabackend.module;


import com.esewa.javabackend.enums.ReactionType;
import com.esewa.javabackend.enums.ResourceType;
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
@Table(name = "reactions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"resource_type", "resource_id", "user_id"}))
public class Reaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    private ResourceType resourceType;



    private UUID resourceId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private ReactionType type;

    @CreationTimestamp
    private Instant createdAt;
}



