package com.esewa.javabackend.module;


import com.esewa.javabackend.enums.MediaType;
import com.esewa.javabackend.enums.Privacy;
import com.esewa.javabackend.module.base.AuditingEntity;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "posts")
public class Post extends AuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Integer id;

    @ManyToOne(optional = false)
    private User author;

    @Column(columnDefinition = "TEXT")
    private String contentText;

    @OneToMany(mappedBy = "post", cascade =  CascadeType.ALL, orphanRemoval = true)
    private List<Media> medias = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private Privacy privacy;

    private boolean pinned;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Comment> comments = new HashSet<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Reaction> reactions = new HashSet<>();
}



