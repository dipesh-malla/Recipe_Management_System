package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.PostDTO;
import com.esewa.javabackend.dto.UserDTO.UserDTO;
import com.esewa.javabackend.module.Post;
import com.esewa.javabackend.module.User;
import org.mapstruct.*;
import org.mapstruct.factory.Mappers;


@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(source = "id", target = "id")
    UserDTO toDTO(User user);

    @Mapping(source = "id", target = "id")
    User toEntity(UserDTO userDTO);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(UserDTO dto, @MappingTarget User entity);
}
