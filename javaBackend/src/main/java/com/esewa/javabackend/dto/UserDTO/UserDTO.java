package com.esewa.javabackend.dto.UserDTO;


import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private Integer id;
    private String username;
    private String displayName;
    private String email;
    private String password;
    private boolean isChef;
    private List<String> badges;
    private boolean verified;
    private String role;
}

