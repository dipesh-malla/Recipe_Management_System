package com.esewa.javabackend.dto;


import lombok.*;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostDTO {
    private Integer id;
    private Integer authorId;
    private String contentText;
    private List<MediaDTO> mediaIds;
    private String privacy;
    private boolean pinned;
    private boolean isNew;
}



