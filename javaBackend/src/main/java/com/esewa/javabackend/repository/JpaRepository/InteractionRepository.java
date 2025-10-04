package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.AIML.Interaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface InteractionRepository extends JpaRepository<Interaction, UUID> {}
