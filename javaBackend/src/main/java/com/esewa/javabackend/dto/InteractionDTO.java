package com.esewa.javabackend.dto;

import com.esewa.javabackend.enums.InteractionAction;
import com.esewa.javabackend.enums.ResourceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InteractionDTO {
    private Integer id;
    private Integer userId;
    private ResourceType resourceType;
    private Integer resourceId;
    private InteractionAction action;
    private Double value;
    private Instant createdAT;
    private boolean isNew;
}
