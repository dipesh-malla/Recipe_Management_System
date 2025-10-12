package com.esewa.javabackend.config.kafka;


import com.esewa.javabackend.dto.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationProducer {

    private final KafkaTemplate<String, NotificationEvent> kafkaTemplate;
    private static final String TOPIC = "notifications";

    public void sendNotification(NotificationEvent event) {
        kafkaTemplate.send(TOPIC, event);
    }
}

