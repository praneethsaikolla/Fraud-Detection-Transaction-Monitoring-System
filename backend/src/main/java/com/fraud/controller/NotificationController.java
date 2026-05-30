package com.fraud.controller;

import com.fraud.entity.Notification;
import com.fraud.repository.NotificationRepository;
import com.fraud.entity.User;
import com.fraud.repository.UserRepository;
import com.fraud.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('ANALYST') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Notifications retrieved", 
                notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())));
    }
}
