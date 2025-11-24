package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.AIML.Interaction;
import com.esewa.javabackend.module.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InteractionRepository extends JpaRepository<Interaction, Integer> {
    List<Interaction> findByUser(User user);
}