package com.esewa.javabackend.module;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "user_stats")
public class UserStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    @Builder.Default
    private int recipeCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int followersCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int followingCount = 0;
}
