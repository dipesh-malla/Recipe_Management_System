package com.esewa.javabackend.dto.aiml;

import com.esewa.javabackend.dto.*;
import com.esewa.javabackend.dto.UserDTO.FollowDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.dto.postDTO.PostResponseDTO;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIMLDataDTO {

    //  User metadata and profiles
    private List<UserResponseDTO> users;

    // Text/image posts from the feed
    private List<PostResponseDTO> posts;

    //  Recipes and related information
    private List<RecipeDTO> recipes;

    //  All user–content interactions (likes, views, follows, etc.)
    private List<InteractionDTO> interactions;

    // User follow relationships (social graph)
    private List<FollowDTO> follows;

    // Embedding data (optional for content similarity models)
    private List<EmbeddingDTO> embeddings;

}
