package com.fraud.dto.request;

import com.fraud.entity.AccountStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccountStatusUpdateRequest {
    @NotNull(message = "Status cannot be null")
    private AccountStatus status;
}
