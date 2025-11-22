package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.UserDTO.UserStatDTO;
import com.esewa.javabackend.module.UserStats;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserStatMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "followersCount", target = "followersCount")
    @Mapping(source = "followingCount", target = "followingCount")
    @Mapping(source = "recipeCount", target = "recipeCount")
    UserStatDTO toDTO(UserStats userStat);

    @Mapping(source = "userId", target = "user.id")
    @Mapping(source = "followersCount", target = "followersCount")
    @Mapping(source = "followingCount", target = "followingCount")
    @Mapping(source = "recipeCount", target = "recipeCount")
    UserStats toEntity(UserStatDTO userStatDTO);
}
