package com.fraud.controller;

import com.fraud.dto.request.TransactionRequest;
import com.fraud.dto.response.ApiResponse;
import com.fraud.dto.response.TransactionResponse;
import com.fraud.service.TransactionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> processTransaction(
            @Valid @RequestBody TransactionRequest request, HttpServletRequest httpRequest) {
        
        String ipAddress = httpRequest.getRemoteAddr();
        TransactionResponse response = transactionService.processTransaction(request, ipAddress);
        return ResponseEntity.ok(new ApiResponse<>(true, "Transaction processed", response));
    }

    @GetMapping("/account/{accountId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or hasRole('ANALYST')")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getAccountHistory(@PathVariable Long accountId) {
        List<TransactionResponse> history = transactionService.getAccountHistory(accountId);
        return ResponseEntity.ok(new ApiResponse<>(true, "History retrieved", history));
    }
}
