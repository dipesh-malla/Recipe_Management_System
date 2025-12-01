package com.esewa.javabackend.module.AIML;

import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.module.User;
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
@Table(name = "interactions")
public class Interaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private ResourceType resourceType;

    private Integer resourceId;

    @Enumerated(EnumType.STRING)
    private InteractionAction action;

    private Double value; // optional metric (e.g., rating)

    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "is_new", nullable = false)
    @Builder.Default
    private Boolean isNew = false;
}
