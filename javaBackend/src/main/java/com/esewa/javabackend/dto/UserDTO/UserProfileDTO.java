package com.esewa.javabackend.dto.UserDTO;

import com.esewa.javabackend.dto.MediaDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDTO {
    private Integer id;
    private String displayName;
    private String email;
    private String bio;
    private String location;
    private List<String> dietaryPreferences;
    private List<String> badges;
    private String privacySettings;
    private MediaDTO profile;
}

