package com.fraud.service;

import com.fraud.dto.request.TransactionRequest;
import com.fraud.dto.response.TransactionResponse;
import com.fraud.entity.*;
import com.fraud.repository.AccountRepository;
import com.fraud.repository.FraudAlertRepository;
import com.fraud.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final FraudAlertRepository fraudAlertRepository;
    private final FraudDetectionEngine fraudEngine;

    @Transactional
    public TransactionResponse processTransaction(TransactionRequest request, String ipAddress) {
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (account.getStatus() == AccountStatus.BLOCKED || account.getStatus() == AccountStatus.SUSPENDED) {
            throw new RuntimeException("Cannot transact on a " + account.getStatus() + " account");
        }

        Transaction transaction = Transaction.builder()
                .account(account)
                .type(request.getType())
                .amount(request.getAmount())
                .targetAccountId(request.getTargetAccountId())
                .ipAddress(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();

        // 1. Check balances
        if (request.getType() == TransactionType.WITHDRAWAL || request.getType() == TransactionType.TRANSFER) {
            if (account.getBalance().compareTo(request.getAmount()) < 0) {
                transaction.setStatus(TransactionStatus.FAILED);
                transactionRepository.save(transaction);
                throw new RuntimeException("Insufficient balance");
            }
        }

        // 2. Fraud Detection
        long recentTxCount = transactionRepository.countByAccountIdAndTimestampAfter(
                account.getId(), LocalDateTime.now().minusMinutes(1));
        
        boolean isLarge = fraudEngine.isLargeTransaction(request.getAmount());
        boolean isFrequent = fraudEngine.isHighFrequency(recentTxCount);
        
        RiskLevel risk = fraudEngine.calculateRiskLevel(isLarge, isFrequent);

        if (risk == RiskLevel.CRITICAL || risk == RiskLevel.HIGH) {
            transaction.setStatus(TransactionStatus.REJECTED);
            transactionRepository.save(transaction);
            
            // Generate Alert
            createFraudAlert(transaction, risk, "High Risk/Amount Detected");
            
            // Auto block account on critical
            if (risk == RiskLevel.CRITICAL) {
                account.setStatus(AccountStatus.BLOCKED);
                accountRepository.save(account);
            }
            throw new RuntimeException("Transaction blocked due to fraud prevention.");
        } else {
            transaction.setStatus(TransactionStatus.COMPLETED);
        }

        // 3. Execute Money Movement
        if (transaction.getStatus() == TransactionStatus.COMPLETED) {
            if (request.getType() == TransactionType.DEPOSIT) {
                account.setBalance(account.getBalance().add(request.getAmount()));
            } else if (request.getType() == TransactionType.WITHDRAWAL) {
                account.setBalance(account.getBalance().subtract(request.getAmount()));
            } else if (request.getType() == TransactionType.TRANSFER) {
                account.setBalance(account.getBalance().subtract(request.getAmount()));
                
                if (request.getTargetAccountId() != null) {
                    Account target = accountRepository.findById(request.getTargetAccountId())
                            .orElseThrow(() -> new RuntimeException("Target account not found"));
                    target.setBalance(target.getBalance().add(request.getAmount()));
                    accountRepository.save(target);
                }
            }
            accountRepository.save(account);
        }

        Transaction savedTx = transactionRepository.save(transaction);
        
        if (risk == RiskLevel.MEDIUM) {
             createFraudAlert(savedTx, risk, "Medium Risk: High Frequency");
        }

        return mapToResponse(savedTx);
    }

    private void createFraudAlert(Transaction tx, RiskLevel risk, String rule) {
        FraudAlert alert = FraudAlert.builder()
                .transaction(tx)
                .riskLevel(risk)
                .ruleTriggered(rule)
                .status(AlertStatus.OPEN)
                .build();
        fraudAlertRepository.save(alert);
    }

    public List<TransactionResponse> getAccountHistory(Long accountId) {
        return transactionRepository.findByAccountIdOrderByTimestampDesc(accountId)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private TransactionResponse mapToResponse(Transaction tx) {
        return TransactionResponse.builder()
                .id(tx.getId())
                .accountId(tx.getAccount().getId())
                .type(tx.getType())
                .amount(tx.getAmount())
                .targetAccountId(tx.getTargetAccountId())
                .status(tx.getStatus())
                .timestamp(tx.getTimestamp())
                .ipAddress(tx.getIpAddress())
                .build();
    }
}
