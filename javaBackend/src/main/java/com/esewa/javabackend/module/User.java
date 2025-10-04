package com.esewa.javabackend.module;


import com.esewa.javabackend.enums.Role;
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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String username;

    private String displayName;

    @Column(unique = true, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String password;

    private String bio;
    private String location;
    private String website;

    private boolean isChef;

    @Column(columnDefinition = "TEXT")
    private String chefCredentials;

//    @Column(columnDefinition = "jsonb")
//    private String dietaryPreferences;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_dietary_preferences", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "preference")
    private List<String> dietaryPreferences;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_badges", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "badge")
    private List<String> badges = new ArrayList<>();

    private String privacySettings; // JSON


    @UpdateTimestamp
    private Instant lastActiveAt;

    private boolean verified;
}
