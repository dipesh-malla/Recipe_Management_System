package com.esewa.javabackend.dto.event;

import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.ResourceType;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InteractionEvent {
    private Integer userId;
    private ResourceType resourceType;
    private Integer resourceId;
    private InteractionAction action;
    private Double value;
}
