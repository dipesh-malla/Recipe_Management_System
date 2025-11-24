package com.esewa.javabackend.module;

import com.esewa.javabackend.enums.FriendShipStatus;
import com.esewa.javabackend.module.base.AuditingEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "friends",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_a_id", "user_b_id"}))
public class Friend extends AuditingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_a_id")
    private User userA;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_b_id")
    private User userB;



    @Enumerated(EnumType.STRING)
    private FriendShipStatus status;
}
