package com.esewa.javabackend.module;

import com.esewa.javabackend.enums.Privacy;
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

    private boolean isChef;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_dietary_preferences", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "preference")
    @Builder.Default
    private List<String> dietaryPreferences = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_badges", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "badge")
    @Builder.Default
    private List<String> badges = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private Privacy privacySettings;

    @UpdateTimestamp
    private Instant lastActiveAt;

    private boolean verified;

    @OneToOne(mappedBy = "owner")
    private Media profile;

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Recipe> recipe;

    @OneToMany(mappedBy = "followee", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Follow> followers = new ArrayList<>();

    @OneToMany(mappedBy = "follower", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Follow> following = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Share> shares = new ArrayList<>();

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Post> posts = new ArrayList<>();

    private boolean isNew = true;

}
