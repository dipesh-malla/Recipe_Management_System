package com.esewa.javabackend.dto.UserDTO;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequestDTO {
    private Integer id;
    private String username;
    private String displayName;
    private String email;
    private String password;
}
