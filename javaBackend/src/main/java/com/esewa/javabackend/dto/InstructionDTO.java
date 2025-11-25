package com.esewa.javabackend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class InstructionDTO {
    private Integer id;

    @JsonAlias({ "step_number", "stepNumber" })
    private Integer stepNumber;

    @JsonAlias({ "step_description", "stepDescription", "content" })
    private String stepDescription;
}
