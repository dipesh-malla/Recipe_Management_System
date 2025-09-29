package com.esewa.javabackend.dto;


import lombok.*;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class    PostDTO {
    private UUID id;
    private UUID authorId;
    private String contentText;
    private List<UUID> mediaIds;
    private String privacy;
    private boolean pinned;
}

