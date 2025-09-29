package com.esewa.javabackend.module;


import com.esewa.javabackend.module.base.AuditingEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "users")
public class User extends AuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String username;

    private String displayName;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    private String bio;
    private String location;
    private String website;

    private boolean isChef;

    @Column(columnDefinition = "TEXT")
    private String chefCredentials;

    @Column(columnDefinition = "jsonb")
    private String dietaryPreferences; // stored as JSON

    @ElementCollection
    @CollectionTable(name = "user_badges", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "badge")
    private List<String> badges = new ArrayList<>();

    @Column(columnDefinition = "jsonb")
    private String privacySettings; // JSON


    @UpdateTimestamp
    private Instant lastActiveAt;

    private boolean verified;
}
