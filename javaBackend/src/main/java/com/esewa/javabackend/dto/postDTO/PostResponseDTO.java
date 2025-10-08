package com.esewa.javabackend.dto.postDTO;

import com.esewa.javabackend.dto.CommentDTO;
import com.esewa.javabackend.dto.MediaDTO;
import com.esewa.javabackend.dto.ReactionDTO;
import com.esewa.javabackend.dto.UserDTO.UserDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.module.Media;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostResponseDTO {

    private Integer id;
    private UserDTO author;
    private String contentText;
    private String privacy;
    private boolean pinned;
    private List<MediaDTO> medias;
    private List<CommentDTO> comments;
    private List<ReactionDTO> reactions;
}

