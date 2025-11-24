package com.esewa.javabackend.dto.UserDTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowRequestDTO {
    @JsonProperty("followerId")
    private Integer follower;

    @JsonProperty("followeeId")
    private Integer followee;
}
