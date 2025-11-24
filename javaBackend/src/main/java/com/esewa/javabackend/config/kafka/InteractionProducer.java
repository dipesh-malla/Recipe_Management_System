package com.esewa.javabackend.config.kafka;

import com.esewa.javabackend.dto.event.InteractionEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InteractionProducer {

    private final KafkaTemplate<String, InteractionEvent> kafkaTemplate;
    private static final String TOPICS = "interactions";

    public void sendInteraction(InteractionEvent event) {
        kafkaTemplate.send(TOPICS, event);
    }
}
