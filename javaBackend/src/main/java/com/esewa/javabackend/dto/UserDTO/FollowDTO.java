package com.esewa.javabackend.dto.UserDTO;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowDTO {
    private Integer id;
    private UserDTO follower;
    private UserDTO followee;
    private LocalDateTime createdDate;
    private String status;
    private boolean isNew;
}

