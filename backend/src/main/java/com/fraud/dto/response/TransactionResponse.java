package com.fraud.dto.response;

import com.fraud.entity.TransactionStatus;
import com.fraud.entity.TransactionType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class TransactionResponse {
    private Long id;
    private Long accountId;
    private TransactionType type;
    private BigDecimal amount;
    private Long targetAccountId;
    private TransactionStatus status;
    private LocalDateTime timestamp;
    private String ipAddress;
}
