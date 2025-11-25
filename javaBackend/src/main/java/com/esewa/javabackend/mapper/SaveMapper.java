package com.esewa.javabackend.mapper;


import com.esewa.javabackend.dto.SaveDTO;
import com.esewa.javabackend.module.Save;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface SaveMapper {

    @Mapping(target = "userId", source = "user.id")
    SaveDTO toDTO(Save save);

    @Mapping(target = "user.id", source = "userId")
    Save toEntity(SaveDTO dto);
}
