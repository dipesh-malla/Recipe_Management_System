package com.esewa.javabackend.dto;



import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaDTO {
    private Integer id;
    private String type;        // IMAGE or VIDEO
    private String url;
    private String thumbnailUrl;
}