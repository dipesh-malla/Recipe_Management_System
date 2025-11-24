package com.esewa.javabackend.mapper;


import com.esewa.javabackend.dto.aiml.EmbeddingDTO;
import com.esewa.javabackend.module.AIML.Embedding;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface EmbeddingMapper {
    EmbeddingDTO toDTO(Embedding embedding);
}