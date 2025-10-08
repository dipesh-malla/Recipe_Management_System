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
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Integer id;

    @OneToOne
    @JoinColumn(name = "owner_id")
    private User owner;

    @ManyToOne
    @JoinColumn(name = "post_id")
    private Post post;

    @Enumerated(EnumType.STRING)
    private MediaType type;

    private String url;

    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    private ModerationStatus moderationStatus;

}