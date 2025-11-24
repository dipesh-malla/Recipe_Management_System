package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.CommentDTO;
import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.dto.ReactionDTO;
import com.esewa.javabackend.dto.postDTO.PostResponseDTO;
import com.esewa.javabackend.module.Comment;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.module.Reaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", uses = {CommentMapper.class, ReactionMapper.class, MediaMapper.class, UserMapper.class})
public interface PostMapper {

    @Mapping(source = "author.id", target = "author.id")
    @Mapping(source = "author.username", target = "author.username")
    @Mapping(source = "author.displayName", target = "author.displayName")
    @Mapping(source = "author.profile.url", target = "author.profileUrl")
    @Mapping(source = "new" , target = "isNew")
    PostResponseDTO toResponseDTO(Post post);

    @Mapping(source = "authorId", target = "author.id")
    Post toEntity(PostDTO postDTO);

    @Mapping(source = "authorId", target = "author.id")
    @Mapping(source = "new", target = "new")
    void updatePostFromDTO(PostDTO postDTO, @MappingTarget Post post);

    @Mapping(source = "new" , target = "isNew")
    PostDTO toDTO(Post post);
}


