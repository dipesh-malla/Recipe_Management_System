package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {}
