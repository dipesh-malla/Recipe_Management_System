package com.esewa.javabackend.module;

import com.esewa.javabackend.enums.ModerationStatus;
import com.esewa.javabackend.module.base.AuditingEntity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "recipes")
public class Recipe extends AuditingEntity {

    @Id
    @SequenceGenerator(name = "recipes_seq", sequenceName = "recipes_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "recipes_seq")
    private Integer id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;
    //
    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Instruction> instructions = new ArrayList<>();

    private Integer servings;
    private String dietaryType;
    private Integer cookTime; // minutes
    private Integer prepTime; // minutes
    private String difficulty;
    private String cuisine;
    // JSONB columns used by the DB - prefer these when present
    @Column(name = "ingredients", columnDefinition = "jsonb", insertable = false, updatable = false)
    private String ingredientsJsonb;

    @Column(name = "instructions", columnDefinition = "jsonb", insertable = false, updatable = false)
    private String instructionsJsonb;

    // Older/text columns that may also exist - keep for compatibility
    @Column(name = "ingredients_jsonb", columnDefinition = "text", insertable = false, updatable = false)
    private String ingredientsJson;

    @Column(name = "instructions_json", columnDefinition = "text", insertable = false, updatable = false)
    private String instructionsJson;
    @Builder.Default
    private boolean isPublic = true;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Media> media = new ArrayList<>();
    @Column(name = "is_new", nullable = false)
    @Builder.Default
    private Boolean isNew = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ModerationStatus moderationStatus = ModerationStatus.PENDING;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RecipeComment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Ingredients> ingredients = new ArrayList<>();

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Tag> tags = new ArrayList<>();

    // Direct count columns
    @Column(name = "like_count")
    private Integer likeCount;

    @Column(name = "comment_count")
    private Integer commentCount;
}
