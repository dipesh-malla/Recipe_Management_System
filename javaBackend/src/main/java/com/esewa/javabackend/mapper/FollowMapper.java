package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.UserDTO.FollowDTO;
import com.esewa.javabackend.dto.UserDTO.UserDTO;
import com.esewa.javabackend.module.Follow;
import com.esewa.javabackend.module.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FollowMapper {

    @Mapping(source = "follower", target = "follower")
    @Mapping(source = "followee", target = "followee")
    @Mapping(source = "new", target = "isNew")
    FollowDTO toDTO(Follow follow);

    @Mapping(source = "follower", target = "follower")
    @Mapping(source = "followee", target = "followee")
    Follow toEntity(FollowDTO dto);

    UserDTO toUserDTO(User user);
    User toUser(UserDTO dto);
}
