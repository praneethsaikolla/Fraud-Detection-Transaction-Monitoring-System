package com.fraud.controller;

import com.fraud.dto.request.AccountStatusUpdateRequest;
import com.fraud.dto.request.CreateAccountRequest;
import com.fraud.dto.response.AccountResponse;
import com.fraud.dto.response.ApiResponse;
import com.fraud.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping("/create")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<AccountResponse>> createAccount(
            @Valid @RequestBody CreateAccountRequest request, Authentication authentication) {
        
        AccountResponse account = accountService.createAccount(request, authentication.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "Account created successfully", account));
    }

    @PostMapping("/admin/create")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AccountResponse>> createAccountAsAdmin(
            @Valid @RequestBody com.fraud.dto.request.AdminCreateAccountRequest request) {
        
        AccountResponse account = accountService.createAccountForUser(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Account created successfully for user", account));
    }

    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<List<AccountResponse>>> getMyAccounts(Authentication authentication) {
        List<AccountResponse> accounts = accountService.getMyAccounts(authentication.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "Accounts retrieved successfully", accounts));
    }
    
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ANALYST')")
    public ResponseEntity<ApiResponse<List<AccountResponse>>> getAllAccounts() {
        List<AccountResponse> accounts = accountService.getAllAccounts();
        return ResponseEntity.ok(new ApiResponse<>(true, "All accounts retrieved successfully", accounts));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or hasRole('ANALYST')")
    public ResponseEntity<ApiResponse<AccountResponse>> getAccountById(
            @PathVariable Long id, Authentication authentication) {
        
        AccountResponse account = accountService.getAccountById(id, authentication.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "Account retrieved successfully", account));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AccountResponse>> updateAccountStatus(
            @PathVariable Long id, @Valid @RequestBody AccountStatusUpdateRequest request) {
        
        AccountResponse account = accountService.updateAccountStatus(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Account status updated successfully", account));
    }
}
