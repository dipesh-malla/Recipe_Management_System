package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Reaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReactionRepository extends JpaRepository<Reaction, UUID> {
    Optional<Reaction> findByPostIdAndUserId(Integer postId, Integer userId);
}
