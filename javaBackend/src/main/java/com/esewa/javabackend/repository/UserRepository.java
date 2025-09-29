package com.esewa.javabackend.repository;

import com.esewa.javabackend.module.*;
import com.esewa.javabackend.module.AIML.Embedding;
import com.esewa.javabackend.module.AIML.Interaction;
import com.esewa.javabackend.module.AIML.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {}


