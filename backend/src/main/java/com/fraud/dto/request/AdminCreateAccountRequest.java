package com.fraud.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class AdminCreateAccountRequest {
    @NotNull(message = "User ID cannot be null")
    private Long userId;

    @NotNull(message = "Initial deposit cannot be null")
    @DecimalMin(value = "0.0", inclusive = true, message = "Initial deposit must be greater than or equal to 0")
    private BigDecimal initialDeposit;
}
