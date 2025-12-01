package com.esewa.javabackend.dto;

import com.esewa.javabackend.enums.ResourceType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveDTO {
    private Integer id;
    private Integer userId;
    private ResourceType resourceType;
    private Integer resourceId;
    private String shareText;
}
