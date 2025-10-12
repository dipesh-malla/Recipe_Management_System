package com.esewa.javabackend.repository.JpaRepository;

import com.esewa.javabackend.enums.ReportStatus;
import com.esewa.javabackend.module.AIML.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, Integer> {
    List<Report> findByStatus(ReportStatus status);
}