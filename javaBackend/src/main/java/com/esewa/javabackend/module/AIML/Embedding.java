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
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    private ObjectType objectType;

    private UUID objectId;

    @Column(columnDefinition = "float8[]")
    private float[] vector; // requires Postgres array type or serialize as JSON

    private String modelVersion;

    @CreationTimestamp
    private Instant createdAt;
}



