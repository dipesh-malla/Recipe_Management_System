package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.UserDTO.UserStatDTO;
import com.esewa.javabackend.module.UserStats;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserStatMapper {

    @Mapping(source = "user.id", target = "userId")
    UserStatDTO toDTO(UserStats userStat);

    @Mapping(source = "userId", target = "user.id")
    UserStats toEntity(UserStatDTO userStatDTO);
}
