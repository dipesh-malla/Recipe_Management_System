package com.esewa.javabackend.service.AIML;


import com.esewa.javabackend.dto.InteractionDTO;
import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.module.AIML.Interaction;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.InteractionRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InteractionService {

    private final InteractionRepository repository;
    private final UserRepository userRepository;

    public InteractionDTO logInteraction(Integer id, ResourceType type, Integer resourceId, InteractionAction action, Double value) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Interaction interaction = Interaction.builder()
                .user(user)
                .resourceType(type)
                .resourceId(resourceId)
                .action(action)
                .value(value)
                .createdAt(Instant.now())
                .build();
         repository.save(interaction);
         return InteractionDTO.builder()
                 .userId(id)
                 .resourceType(type)
                 .resourceId(resourceId)
                 .action(action)
                 .value(value)
                 .build();
    }

    public List<InteractionDTO> allInteraction() {

        return repository.findAll().stream()
                .map(interaction -> InteractionDTO.builder()
                        .id(interaction.getId())
                        .userId(interaction.getUser().getId())
                        .resourceType(interaction.getResourceType())
                        .resourceId(interaction.getResourceId())
                        .action(interaction.getAction())
                        .value(interaction.getValue())
                        .createdAT(interaction.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }
}
