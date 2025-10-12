package com.esewa.javabackend.dto.UserDTO;

import com.esewa.javabackend.module.Media;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowerDTO {
    private Integer id;       // follower id
    private String username;
    private String displayName;
    private String profile;
}
