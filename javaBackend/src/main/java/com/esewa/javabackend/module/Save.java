package com.esewa.javabackend.module;


import com.esewa.javabackend.enums.ResourceType;
import jakarta.persistence.*;
import lombok.*;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "save")
public class Save {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private ResourceType resourceType;

    private Integer resourceId;

    @Column(columnDefinition = "TEXT")
    private String shareText;

}

