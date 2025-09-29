package com.esewa.javabackend.module;

import com.esewa.javabackend.enums.FriendShipStatus;
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
@Table(name = "friends",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_a_id", "user_b_id"}))
public class Friend {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_a_id")
    private User userA;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_b_id")
    private User userB;

    @CreationTimestamp
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    private FriendShipStatus status;
}
