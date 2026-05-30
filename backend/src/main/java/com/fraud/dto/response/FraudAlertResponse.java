package com.fraud.dto.response;

import com.fraud.entity.AlertStatus;
import com.fraud.entity.FraudAlert;
import com.fraud.entity.RiskLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class FraudAlertResponse {
    private Long id;
    private Long transactionId;
    private Long accountId;
    private Long userId;
    private RiskLevel riskLevel;
    private String ruleTriggered;
    private String description;
    private AlertStatus status;
    private LocalDateTime createdAt;
    private String accountHolderName;
    private BigDecimal transactionAmount;
    /**
     * Factory method — maps the JPA entity to a safe DTO,
     * avoiding any lazy-load issues outside a transaction.
     */
    public static FraudAlertResponse from(FraudAlert alert) {
        Long txId    = alert.getTransaction() != null ? alert.getTransaction().getId() : null;
        Long acctId  = (alert.getTransaction() != null && alert.getTransaction().getAccount() != null)
                ? alert.getTransaction().getAccount().getId() : null;
        Long userId  = (alert.getTransaction() != null
                && alert.getTransaction().getAccount() != null
                && alert.getTransaction().getAccount().getUser() != null)
                ? alert.getTransaction().getAccount().getUser().getId() : null;

        String accountHolderName = (alert.getTransaction() != null
                && alert.getTransaction().getAccount() != null
                && alert.getTransaction().getAccount().getUser() != null)
                ? alert.getTransaction().getAccount().getUser().getFirstName() + " " + alert.getTransaction().getAccount().getUser().getLastName() : null;

        java.math.BigDecimal amount = alert.getTransaction() != null ? alert.getTransaction().getAmount() : null;

        return FraudAlertResponse.builder()
                .id(alert.getId())
                .transactionId(txId)
                .accountId(acctId)
                .userId(userId)
                .riskLevel(alert.getRiskLevel())
                .ruleTriggered(alert.getRuleTriggered())
                .description(alert.getRuleTriggered())
                .status(alert.getStatus())
                .createdAt(alert.getCreatedAt())
                .accountHolderName(accountHolderName)
                .transactionAmount(amount)
                .build();
    }
}
