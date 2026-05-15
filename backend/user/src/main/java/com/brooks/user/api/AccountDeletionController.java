package com.brooks.user.api;

import com.brooks.auth.service.AuthService;
import com.brooks.user.dto.DeleteAccountAuthRequest;
import com.brooks.user.dto.DeleteAccountPublicRequest;
import com.brooks.user.service.AccountDeletionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Account-deletion endpoints required by Google Play Console and Apple App Store policy.
 *
 * <ul>
 *   <li>{@code POST /api/account/delete} — authenticated; soft-deletes the
 *       caller in one shot. Reached from the in-app Settings flow.</li>
 *   <li>{@code POST /api/account/delete-request} — public; records a
 *       deletion request keyed by a one-time token. Reached from
 *       brooksweb.uk/account/delete (for users who can't sign in).
 *       Always returns 200 — account-enumeration defence.</li>
 *   <li>{@code GET /api/account/delete/confirm?token=...} — public; the
 *       link emailed to the user finalises the deletion.</li>
 * </ul>
 *
 * <p>The two public endpoints are explicitly permitted in {@code SecurityConfig};
 * everything else under {@code /api/**} requires authentication.
 */
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountDeletionController {

    private static final Logger log = LoggerFactory.getLogger(AccountDeletionController.class);

    private final AccountDeletionService deletionService;
    private final AuthService authService;

    @PostMapping("/delete")
    public ResponseEntity<Map<String, Object>> deleteAuthenticated(
            Authentication authentication,
            @Valid @RequestBody(required = false) DeleteAccountAuthRequest body
    ) {
        String subject = authService.extractSubject(authentication);
        String reason = body == null ? null : body.reason();
        deletionService.deleteAuthenticated(subject, reason);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/delete-request")
    public ResponseEntity<Map<String, Object>> requestPublicDeletion(
            @Valid @RequestBody DeleteAccountPublicRequest body,
            HttpServletRequest req
    ) {
        String sourceIp = extractClientIp(req);
        String userAgent = clip(req.getHeader("User-Agent"), 512);
        try {
            deletionService.requestPublicDeletion(body.email(), body.reason(), sourceIp, userAgent);
        } catch (Exception ex) {
            // Never propagate upstream errors — would leak account existence.
            log.warn("Public deletion request handling failed silently: {}", ex.toString());
        }
        // Always 200, always empty body — same response whether user exists or not.
        return ResponseEntity.ok(Map.of());
    }

    @GetMapping("/delete/confirm")
    public ResponseEntity<Map<String, Object>> confirmDeletion(@RequestParam("token") String token) {
        AccountDeletionService.ConfirmResult result = deletionService.confirmDeletion(token);
        return switch (result) {
            case OK -> ResponseEntity.ok(Map.of("status", "deleted"));
            case ALREADY_USED -> ResponseEntity.status(410).body(Map.of("status", "already_used"));
            case EXPIRED -> ResponseEntity.status(410).body(Map.of("status", "expired"));
            case INVALID -> ResponseEntity.status(404).body(Map.of("status", "invalid"));
        };
    }

    private static String extractClientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) {
            int comma = fwd.indexOf(',');
            String first = (comma > 0 ? fwd.substring(0, comma) : fwd).trim();
            if (first.length() <= 64) return first;
        }
        String remote = req.getRemoteAddr();
        if (remote != null && remote.length() <= 64) return remote;
        return null;
    }

    private static String clip(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
