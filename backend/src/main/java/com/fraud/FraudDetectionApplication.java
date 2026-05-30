package com.fraud;

import com.fraud.entity.Account;
import com.fraud.entity.Role;
import com.fraud.entity.User;
import com.fraud.entity.UserStatus;
import com.fraud.repository.AccountRepository;
import com.fraud.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;

@SpringBootApplication
@EnableCaching
public class FraudDetectionApplication {

    public static void main(String[] args) {
        SpringApplication.run(FraudDetectionApplication.class, args);
    }

    @Bean
    public CommandLineRunner initData(UserRepository userRepository, AccountRepository accountRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.count() == 0) {
                User admin = User.builder()
                        .firstName("Admin")
                        .lastName("User")
                        .email("admin@fraudguard.com")
                        .password(passwordEncoder.encode("admin123"))
                        .status(UserStatus.ACTIVE)
                        .roles(Set.of(Role.ROLE_ADMIN, Role.ROLE_ANALYST))
                        .build();

                User normalUser = User.builder()
                        .firstName("John")
                        .lastName("Doe")
                        .email("user@fraudguard.com")
                        .password(passwordEncoder.encode("user123"))
                        .status(UserStatus.ACTIVE)
                        .roles(Set.of(Role.ROLE_USER))
                        .build();

                User savedAdmin = userRepository.save(admin);
                User savedUser = userRepository.save(normalUser);

                // Create accounts so they can import transactions
                Account adminAccount = Account.builder()
                        .user(savedAdmin)
                        .accountNumber("100000000001")
                        .balance(new java.math.BigDecimal("50000.00"))
                        .status(com.fraud.entity.AccountStatus.ACTIVE)
                        .build();

                Account userAccount = Account.builder()
                        .user(savedUser)
                        .accountNumber("100000000002")
                        .balance(new java.math.BigDecimal("15000.00"))
                        .status(com.fraud.entity.AccountStatus.ACTIVE)
                        .build();

                accountRepository.save(adminAccount);
                accountRepository.save(userAccount);
            }
        };
    }
}
