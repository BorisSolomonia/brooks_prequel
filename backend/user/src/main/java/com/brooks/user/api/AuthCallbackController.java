package com.brooks.user.api;

import com.brooks.auth.service.AuthService;
import com.brooks.user.domain.User;
import com.brooks.user.dto.UserResponse;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthCallbackController {

    private final UserService userService;
    private final AuthService authService;

    @PostMapping("/callback")
    public ResponseEntity<UserResponse> callback(Authentication authentication) {
        String subject = authService.extractSubject(authentication);
        String email = authService.extractEmail(authentication).orElse("");
        User user = userService.findOrCreateUser(subject, email);
        return ResponseEntity.ok(toResponse(user));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        String subject = authService.extractSubject(authentication);
        User user = userService.findByAuth0Subject(subject);
        return ResponseEntity.ok(toResponse(user));
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole())
                .status(user.getStatus())
                .onboardingCompleted(user.isOnboardingCompleted())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
