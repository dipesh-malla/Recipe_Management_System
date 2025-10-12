package com.esewa.javabackend.dto.UserDTO;


import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowRequestDTO {
    private Integer follower;
    private Integer followee;
}
