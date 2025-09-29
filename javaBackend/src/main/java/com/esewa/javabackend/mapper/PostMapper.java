package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.module.Post;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface PostMapper {

    PostMapper INSTANCE = Mappers.getMapper(PostMapper.class);

    @Mapping(source = "author.id", target = "authorId")
    PostDTO toDTO(Post post);

    @Mapping(source = "authorId", target = "author.id")
    Post toEntity(PostDTO postDTO);
}
