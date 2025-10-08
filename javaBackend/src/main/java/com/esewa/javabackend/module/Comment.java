package com.esewa.javabackend.module;


import com.esewa.javabackend.module.base.AuditingEntity;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.List;
import java.util.Set;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "comments")
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Comment extends AuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Comment parent; // nullable for root-level comment

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Comment> replies;

    @ManyToOne(optional = false)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(columnDefinition = "TEXT")
    private String body;

    private boolean deletedFlag = false;

    @ManyToOne(optional = false)
    @JoinColumn(name = "post_id")
    private Post post;
}

