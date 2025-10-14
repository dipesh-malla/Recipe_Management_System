package com.esewa.javabackend.service.AIML;


import com.esewa.javabackend.dto.aiml.EmbeddingDTO;
import com.esewa.javabackend.enums.ObjectType;
import com.esewa.javabackend.module.AIML.Embedding;
import com.esewa.javabackend.repository.JpaRepository.EmbeddingRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final EmbeddingRepository embeddingRepository;


    @Transactional
    public Embedding saveOrUpdateEmbedding(ObjectType objectType,
                                           Integer objectId,
                                           float[] vector,
                                           String modelVersion) {

        return embeddingRepository.findByObjectTypeAndObjectId(objectType, objectId)
                .map(existing -> {
                    existing.setVector(vector);
                    existing.setModelVersion(modelVersion);
                    return embeddingRepository.save(existing);
                })
                .orElseGet(() -> embeddingRepository.save(
                        Embedding.builder()
                                .objectType(objectType)
                                .objectId(objectId)
                                .vector(vector)
                                .modelVersion(modelVersion)
                                .build()
                ));
    }


    public Embedding getEmbedding(ObjectType objectType, Integer objectId) {
        return embeddingRepository.findByObjectTypeAndObjectId(objectType, objectId)
                .orElse(null);
    }


    public List<Embedding> getAllByType(ObjectType objectType) {
        return embeddingRepository.findByObjectType(objectType);
    }

    public List<EmbeddingDTO> getAllEmbeddings() {
        return embeddingRepository.findAll()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private EmbeddingDTO mapToDTO(Embedding embedding) {
        return EmbeddingDTO.builder()
                .id(embedding.getId())
                .objectType(embedding.getObjectType())
                .objectId(embedding.getObjectId())
                .vector(embedding.getVector())
                .modelVersion(embedding.getModelVersion())
                .createdAt(embedding.getCreatedAt())
                .build();
    }



}
