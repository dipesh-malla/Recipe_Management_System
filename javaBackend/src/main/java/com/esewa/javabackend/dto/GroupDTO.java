package com.esewa.javabackend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupDTO {
    private Integer id;
    private String name;
    private String slug;
    private String description;
    private UUID ownerId;
    private boolean isPublic;
}
