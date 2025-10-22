package com.esewa.javabackend.config.kafka;


import com.esewa.javabackend.dto.event.InteractionEvent;
import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.ResourceType;
import com.esewa.javabackend.module.AIML.Interaction;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.InteractionRepository;
import com.esewa.javabackend.repository.JpaRepository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class InteractionConsumer {

    private final InteractionRepository interactionRepository;
    private final UserRepository userRepository;

    @KafkaListener(
            topics = "interactions",
            groupId = "interaction-group",
            containerFactory = "interactionKafkaListenerContainerFactory"
    )
    public void consume(InteractionEvent event) {

        Optional<User> userOpt = userRepository.findById(event.getUserId());
        if (userOpt.isEmpty()) {
            System.out.println("⚠ User not found: " + event.getUserId());
            return;
        }

        User user = userOpt.get();

        Interaction interaction = Interaction.builder()
                .user(user)
                .resourceType(event.getResourceType() != null ? event.getResourceType() : ResourceType.POST)
                .resourceId(event.getResourceId())
                .action(event.getAction() != null ? event.getAction() : InteractionAction.VIEW)
                .value(event.getValue())
                .isNew(true)
                .build();

        interactionRepository.save(interaction);

    }
}

