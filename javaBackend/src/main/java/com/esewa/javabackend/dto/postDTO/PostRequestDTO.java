package com.esewa.javabackend.dto.postDTO;


import com.esewa.javabackend.dto.MediaDTO;
import com.esewa.javabackend.module.Media;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostRequestDTO {
    private Integer authorId;           // ID of the user creating the post
    private String contentText;         // Text content
    private String privacy;             // Privacy enum as String: PUBLIC/PRIVATE
    private boolean pinned;             // Optional: pinned post flag
    private List<MediaDTO> medias;
}