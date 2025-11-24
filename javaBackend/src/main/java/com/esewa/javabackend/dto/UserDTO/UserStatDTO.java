package com.esewa.javabackend.dto.UserDTO;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStatDTO {
    private Integer id;
    private Integer userId;
    private boolean active;
    private int followersCount; // Changed from followerCount to match entity
    private int followingCount;
    private int recipeCount; // Added recipeCount
    private LocalDateTime lastLogin;
}
