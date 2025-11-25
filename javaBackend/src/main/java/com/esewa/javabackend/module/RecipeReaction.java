package com.esewa.javabackend.module;

import com.esewa.javabackend.enums.ReactionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "RecipeReactions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"resource_type", "resource_id", "user_id"}))
public class RecipeReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Integer id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private ReactionType type;

    @CreationTimestamp
    private Instant createdAt;
}
