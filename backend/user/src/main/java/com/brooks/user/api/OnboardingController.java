package com.brooks.user.api;

import com.brooks.auth.service.AuthService;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

    private final UserService userService;
    private final AuthService authService;

    @PostMapping("/complete")
    public ResponseEntity<Void> markComplete(Authentication authentication) {
        String subject = authService.extractSubject(authentication);
        userService.markOnboardingCompleted(subject);
        return ResponseEntity.noContent().build();
    }

    // Persist the user's self-selected onboarding intent (Traveler vs Guide Creator).
    // Invalid values throw BusinessException → 400.
    @PostMapping("/role")
    public ResponseEntity<Void> setRole(Authentication authentication, @RequestBody RoleRequest body) {
        String subject = authService.extractSubject(authentication);
        userService.setPrimaryIntent(subject, body == null ? null : body.role());
        return ResponseEntity.noContent().build();
    }

    public record RoleRequest(String role) {}
}
