package com.esewa.javabackend.mapper;

import com.esewa.javabackend.dto.MediaDTO;
import com.esewa.javabackend.module.Media;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface MediaMapper {

    @Mapping(source = "type", target = "type") // converts Enum to String automatically
    MediaDTO toDTO(Media media);

    @Mapping(target = "type", expression = "java(com.esewa.javabackend.enums.MediaType.valueOf(mediaDTO.getType()))")
    Media toEntity(MediaDTO mediaDTO);

    List<MediaDTO> toDTOList(List<Media> mediaList);

    List<Media> toEntityList(List<MediaDTO> mediaDTOList);
}

