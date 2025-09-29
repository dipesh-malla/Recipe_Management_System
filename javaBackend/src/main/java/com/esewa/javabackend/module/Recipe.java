package com.esewa.javabackend.module;


import com.esewa.javabackend.enums.ModerationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "recipes")
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    private Integer servings;

    private Integer cookTime; // minutes

    private String cuisine;

    private boolean isPublic;

    @ElementCollection
    @CollectionTable(name = "recipe_tags", joinColumns = @JoinColumn(name = "recipe_id"))
    @Column(name = "tag")
    private List<String> tags;

    @Column(columnDefinition = "jsonb")
    private String nutrition; // JSON string (e.g., calories, macros)

    @ElementCollection
    @CollectionTable(name = "recipe_media", joinColumns = @JoinColumn(name = "recipe_id"))
    @Column(name = "media_id")
    private List<UUID> mediaIds;

    @Enumerated(EnumType.STRING)
    private ModerationStatus moderationStatus;

}


