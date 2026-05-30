package com.fraud.service;

import com.fraud.entity.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class FraudDetectionEngine {

    // Rule 1: Large transaction amount
    public boolean isLargeTransaction(BigDecimal amount) {
        return amount.compareTo(new BigDecimal("100000")) > 0;
    }

    // Rule 2: High frequency (checked via repository count in TransactionService)
    public boolean isHighFrequency(long txCountInLastMinute) {
        return txCountInLastMinute >= 5;
    }

    // Determine Risk Level based on rules triggered
    public RiskLevel calculateRiskLevel(boolean largeTx, boolean highFreq) {
        if (largeTx && highFreq) return RiskLevel.CRITICAL;
        if (largeTx) return RiskLevel.HIGH;
        if (highFreq) return RiskLevel.MEDIUM;
        return RiskLevel.LOW;
    }
}
