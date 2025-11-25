package com.esewa.javabackend.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class TagDTO {
    private Integer id;
    private String name;

    // Allow frontend to send tags as plain strings (e.g. ["chicken", "spicy"]).
    @JsonCreator
    public TagDTO(String name) {
        this.name = name;
    }

    @JsonCreator
    public static TagDTO fromObject(@JsonProperty("id") Integer id, @JsonProperty("name") String name) {
        TagDTO t = new TagDTO();
        t.setId(id);
        t.setName(name);
        return t;
    }
}