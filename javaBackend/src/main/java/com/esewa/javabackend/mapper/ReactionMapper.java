package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.ReactionDTO;
import com.esewa.javabackend.module.Reaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReactionMapper {
    @Mapping(source = "user.id", target = "userId")
    ReactionDTO toDTO(Reaction reaction);

    @Mapping(source = "userId", target = "user.id")
    Reaction toEntity(ReactionDTO reactionDTO);
}
