package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.CommentDTO;
import com.esewa.javabackend.module.Comment;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.module.User;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface CommentMapper {

    @Mapping(source = "author.id", target = "authorId")
    @Mapping(source = "author.displayName", target = "authorName")
    @Mapping(source = "createdDate", target = "createdDate")
    @Mapping(source = "modifiedDate", target = "editedDate")
    CommentDTO toDTO(Comment comment);

    @Mapping(source = "authorId", target = "author.id")
    @Mapping(source = "postId", target = "post.id")
//    @Mapping(source = "parentId", target = "parent.id")
    Comment toEntity(CommentDTO commentDTO);
}

