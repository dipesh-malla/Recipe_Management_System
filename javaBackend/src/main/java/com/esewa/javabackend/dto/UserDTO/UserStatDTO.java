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
    private LocalDateTime lastLogin;
}
