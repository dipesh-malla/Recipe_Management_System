package com.esewa.javabackend.service.AIML;


import com.esewa.javabackend.enums.ReportStatus;
import com.esewa.javabackend.enums.TargetTypes;
import com.esewa.javabackend.module.AIML.Report;
import com.esewa.javabackend.module.User;
import com.esewa.javabackend.repository.JpaRepository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository repository;

    public Report submitReport(User reporter, TargetTypes targetType, Integer targetId, String reason) {
        Report report = Report.builder()
                .reporter(reporter)
                .targetType(targetType)
                .targetId(targetId)
                .reason(reason)
                .status(ReportStatus.PENDING)
                .build();
        return repository.save(report);
    }

    public List<Report> getPendingReports() {
        return repository.findByStatus(ReportStatus.PENDING);
    }
}

