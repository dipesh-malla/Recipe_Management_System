package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.module.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {}
