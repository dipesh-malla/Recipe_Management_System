package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.UserDTO.UserProfileDTO;
import com.esewa.javabackend.dto.UserDTO.UserRequestDTO;
import com.esewa.javabackend.dto.UserDTO.UserResponseDTO;
import com.esewa.javabackend.module.User;
import org.mapstruct.*;


@Mapper(componentModel = "spring", uses = {MediaMapper.class})
public interface UserMapper {

    @Mapping(source = "id", target = "id")
    @Mapping(target = "profile.id", source = "profile.id")
    @Mapping(target = "profile.url", source = "profile.url")
    @Mapping(target = "profile.type", source = "profile.type")
    @Mapping(source = "new" , target = "isNew")
    UserResponseDTO toDTO(User user);

    @Mapping(source = "id", target = "id")
    User toEntity(UserRequestDTO userDTO);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(UserRequestDTO dto, @MappingTarget User entity);
    void updateProfile(UserProfileDTO dto, @MappingTarget User entity);

}
