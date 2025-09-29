package com.esewa.javabackend.repository;

import com.esewa.javabackend.module.Share;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ShareRepository extends JpaRepository<Share, UUID> {}
