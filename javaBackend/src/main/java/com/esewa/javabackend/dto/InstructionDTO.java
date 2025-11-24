package com.esewa.javabackend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstructionDTO {
    private Integer id;
    private Integer stepNumber;
    private String stepDescription;
}
