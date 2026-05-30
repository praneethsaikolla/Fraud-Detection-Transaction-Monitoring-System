package com.fraud.controller;

import com.fraud.repository.TransactionRepository;
import com.fraud.repository.FraudAlertRepository;
import com.fraud.repository.AccountRepository;
import com.fraud.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final TransactionRepository transactionRepository;
    private final FraudAlertRepository fraudAlertRepository;
    private final AccountRepository accountRepository;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ANALYST') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardSummary() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalTransactions", transactionRepository.count());
        data.put("totalAlerts", fraudAlertRepository.count());
        data.put("totalAccounts", accountRepository.count());
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Analytics retrieved", data));
    }
}
