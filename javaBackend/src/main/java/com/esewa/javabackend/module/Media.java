package com.esewa.javabackend.module;

import com.esewa.javabackend.enums.MediaType;
import com.esewa.javabackend.enums.ModerationStatus;
import com.esewa.javabackend.module.base.AuditingEntity;
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
@Table(name = "media")
public class Media extends AuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Enumerated(EnumType.STRING)
    private MediaType type;

    private String url;

    private String thumbnailUrl;

    @Column(columnDefinition = "jsonb")
    private String metadata; // JSON with size, dimensions, etc.

    @Enumerated(EnumType.STRING)
    private ModerationStatus moderationStatus;

}