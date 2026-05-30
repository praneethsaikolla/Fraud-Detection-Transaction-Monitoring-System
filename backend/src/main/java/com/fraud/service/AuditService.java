package com.fraud.service;

import com.fraud.entity.AuditLog;
import com.fraud.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository auditLogRepository;

    public void logAction(Long userId, String action, String ipAddress, String severity, String metadata) {
        AuditLog log = AuditLog.builder()
                .userId(userId)
                .action(action)
                .ipAddress(ipAddress)
                .severity(severity)
                .metadata(metadata)
                .build();
        auditLogRepository.save(log);
    }
}
