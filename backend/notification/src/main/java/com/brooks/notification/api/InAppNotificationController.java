package com.brooks.notification.api;

import com.brooks.auth.util.AuthPrincipal;
import com.brooks.notification.dto.InAppNotificationResponse;
import com.brooks.notification.repository.InAppNotificationRepository;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/notifications")
@RequiredArgsConstructor
public class InAppNotificationController {

    private final InAppNotificationRepository inAppRepo;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            Authentication authentication,
            @RequestParam(defaultValue = "20") int limit) {
        UUID userId = userId(authentication);
        int capped = Math.min(Math.max(limit, 1), 50);
        List<InAppNotificationResponse> items = inAppRepo
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, capped))
                .map(InAppNotificationResponse::from)
                .getContent();
        long unread = inAppRepo.countByUserIdAndReadAtIsNull(userId);
        return ResponseEntity.ok(Map.of(
                "items", items,
                "unreadCount", unread
        ));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Integer>> markAllRead(Authentication authentication) {
        UUID userId = userId(authentication);
        int updated = inAppRepo.markAllReadForUser(userId, Instant.now());
        return ResponseEntity.ok(Map.of("markedRead", updated));
    }

    private UUID userId(Authentication authentication) {
        return userService.findByAuth0Subject(AuthPrincipal.subject(authentication)).getId();
    }
}
