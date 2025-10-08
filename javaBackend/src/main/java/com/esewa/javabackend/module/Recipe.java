package com.esewa.javabackend.module;


import com.esewa.javabackend.enums.ModerationStatus;
import com.esewa.javabackend.module.base.AuditingEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "recipes")
public class Recipe  extends AuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Integer id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @ElementCollection
    @CollectionTable(name = "recipe_ingredients", joinColumns = @JoinColumn(name = "recipe_id"))
    @Column(name = "ingredient")
    private List<String> ingredients;

    private Integer servings;

    private Integer cookTime; // minutes

    private String cuisine;

    private boolean isPublic;

    @ElementCollection
    @CollectionTable(name = "recipe_tags", joinColumns = @JoinColumn(name = "recipe_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

//    @Column(columnDefinition = "jsonb")
//    private String nutrition; // JSON string (e.g., calories, macros)

    @ElementCollection
    @CollectionTable(name = "recipe_media", joinColumns = @JoinColumn(name = "recipe_id"))
    @Column(name = "media_id")
    private List<Integer> mediaIds =  new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private ModerationStatus moderationStatus;

}


