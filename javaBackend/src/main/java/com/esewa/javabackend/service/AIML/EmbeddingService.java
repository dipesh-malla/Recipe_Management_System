package com.esewa.javabackend.service.AIML;


import com.esewa.javabackend.enums.ObjectType;
import com.esewa.javabackend.module.AIML.Embedding;
import com.esewa.javabackend.repository.JpaRepository.EmbeddingRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;


@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final EmbeddingRepository embeddingRepository;

    /**
     * Save or update an embedding vector for an object (post, recipe, user, etc.)
     */
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

    /**
     * Get embedding by object
     */
    public Embedding getEmbedding(ObjectType objectType, Integer objectId) {
        return embeddingRepository.findByObjectTypeAndObjectId(objectType, objectId)
                .orElse(null);
    }

    /**
     * Get all embeddings for a given type (e.g., all recipe embeddings)
     */
    public List<Embedding> getAllByType(ObjectType objectType) {
        return embeddingRepository.findByObjectType(objectType);
    }
}
