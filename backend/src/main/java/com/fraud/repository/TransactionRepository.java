package com.fraud.repository;

import com.fraud.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByAccountIdOrderByTimestampDesc(Long accountId);
    List<Transaction> findTop5ByAccountIdOrderByTimestampDesc(Long accountId);
    long countByAccountIdAndTimestampAfter(Long accountId, java.time.LocalDateTime timestamp);
}
