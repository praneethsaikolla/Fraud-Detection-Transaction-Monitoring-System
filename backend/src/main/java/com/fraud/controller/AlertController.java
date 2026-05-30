package com.fraud.controller;

import com.fraud.dto.response.ApiResponse;
import com.fraud.dto.response.FraudAlertResponse;
import com.fraud.entity.FraudAlert;
import com.fraud.repository.FraudAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final FraudAlertRepository fraudAlertRepository;

    @GetMapping
    @PreAuthorize("hasRole('ANALYST') or hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<FraudAlertResponse>>> getAllAlerts() {
        List<FraudAlert> alerts = fraudAlertRepository.findAll();
        List<FraudAlertResponse> response = alerts.stream()
                .map(FraudAlertResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse<>(true, "Alerts retrieved", response));
    }
}
