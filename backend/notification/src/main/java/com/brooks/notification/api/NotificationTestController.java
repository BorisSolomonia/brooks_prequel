package com.brooks.notification.api;

import com.brooks.auth.util.AuthPrincipal;
import com.brooks.notification.service.NotificationService;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Self-send test endpoint. Useful for end-to-end QA of the FCM pipeline
 * without needing to manufacture real domain events (purchase, follow,
 * memory-share). Authenticated users can POST and get a test push back
 * on every device they have registered.
 *
 * Remove or restrict to ADMIN role before production launch.
 */
@RestController
@RequestMapping("/api/me/test-notification")
@RequiredArgsConstructor
public class NotificationTestController {

    private final NotificationService notificationService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<Map<String, String>> sendToSelf(Authentication authentication) {
        String subject = AuthPrincipal.subject(authentication);
        UUID userId = userService.findByAuth0Subject(subject).getId();
        notificationService.notifyUser(
                userId,
                "Brooks test",
                "If you see this, FCM is wired end-to-end. Tap to dismiss.",
                Map.of("type", "test", "ts", String.valueOf(System.currentTimeMillis()))
        );
        return ResponseEntity.accepted().body(Map.of(
                "status", "queued",
                "userId", userId.toString()
        ));
    }
}
