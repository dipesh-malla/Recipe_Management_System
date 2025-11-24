package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.enums.ObjectType;
import com.esewa.javabackend.module.AIML.Embedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmbeddingRepository extends JpaRepository<Embedding, Integer> {

    Optional<Embedding> findByObjectTypeAndObjectId(ObjectType objectType, Integer objectId);

    List<Embedding> findByObjectType(ObjectType objectType);
}