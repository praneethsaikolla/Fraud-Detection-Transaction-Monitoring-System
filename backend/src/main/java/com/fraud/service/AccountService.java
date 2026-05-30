package com.fraud.service;

import com.fraud.dto.request.CreateAccountRequest;
import com.fraud.dto.request.AccountStatusUpdateRequest;
import com.fraud.dto.response.AccountResponse;
import com.fraud.entity.Account;
import com.fraud.entity.AccountStatus;
import com.fraud.entity.User;
import com.fraud.repository.AccountRepository;
import com.fraud.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        String accountNumber = generateUniqueAccountNumber();

        Account account = Account.builder()
                .user(user)
                .accountNumber(accountNumber)
                .balance(request.getInitialDeposit())
                .status(AccountStatus.ACTIVE)
                .build();

        Account savedAccount = accountRepository.save(account);
        return mapToResponse(savedAccount);
    }

    @Transactional
    public AccountResponse createAccountForUser(com.fraud.dto.request.AdminCreateAccountRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));

        String accountNumber = generateUniqueAccountNumber();

        Account account = Account.builder()
                .user(user)
                .accountNumber(accountNumber)
                .balance(request.getInitialDeposit())
                .status(AccountStatus.ACTIVE)
                .build();

        Account savedAccount = accountRepository.save(account);
        return mapToResponse(savedAccount);
    }

    public List<AccountResponse> getMyAccounts(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return accountRepository.findByUserId(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public AccountResponse getAccountById(Long accountId, String email) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        // Only allow owners or admins to view the account
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.name().equals("ROLE_ADMIN"));
        boolean isAnalyst = user.getRoles().stream().anyMatch(r -> r.name().equals("ROLE_ANALYST"));

        if (!account.getUser().getId().equals(user.getId()) && !isAdmin && !isAnalyst) {
            throw new RuntimeException("Unauthorized access to account");
        }

        return mapToResponse(account);
    }
    
    public List<AccountResponse> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AccountResponse updateAccountStatus(Long accountId, AccountStatusUpdateRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        account.setStatus(request.getStatus());
        Account updatedAccount = accountRepository.save(account);
        return mapToResponse(updatedAccount);
    }

    private String generateUniqueAccountNumber() {
        Random random = new Random();
        String accountNumber;
        do {
            // Generate a 12 digit account number starting with a non-zero
            long num = (long) (random.nextDouble() * 9_000_000_000_000L) + 1_000_000_000_000L;
            accountNumber = String.valueOf(num);
        } while (accountRepository.existsByAccountNumber(accountNumber));
        return accountNumber;
    }

    private AccountResponse mapToResponse(Account account) {
        return AccountResponse.builder()
                .id(account.getId())
                .accountNumber(account.getAccountNumber())
                .balance(account.getBalance())
                .status(account.getStatus())
                .userId(account.getUser().getId())
                .createdAt(account.getCreatedAt())
                .updatedAt(account.getUpdatedAt())
                .build();
    }
}
