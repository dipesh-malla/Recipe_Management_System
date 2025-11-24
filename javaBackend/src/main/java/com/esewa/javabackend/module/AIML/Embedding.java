package com.esewa.javabackend.module.AIML;

import com.esewa.javabackend.enums.ObjectType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "embeddings")
public class Embedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Enumerated(EnumType.STRING)
    private ObjectType objectType;

    private Integer objectId;

    @Column(columnDefinition = "float8[]")
    private float[] vector;


    private String modelVersion;

    @CreationTimestamp
    private Instant createdAt;
}



