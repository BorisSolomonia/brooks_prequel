package com.brooks.user.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    public static final String EVENT_LOGIN = "LOGIN";
    public static final String EVENT_ADMIN_ROLE_GRANT = "ADMIN_ROLE_GRANT";
    public static final String EVENT_PAYOUT_DETAILS_UPDATED = "PAYOUT_DETAILS_UPDATED";
    public static final String EVENT_PAYOUT_MARKED_PAID = "PAYOUT_MARKED_PAID";
    public static final String EVENT_ACCOUNT_DELETED = "ACCOUNT_DELETED";

    private final AuditEventRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(UUID userId, String eventType, String metadata) {
        try {
            AuditEvent event = new AuditEvent();
            event.setUserId(userId);
            event.setEventType(eventType);
            HttpServletRequest req = currentRequest();
            if (req != null) {
                event.setIpAddress(extractClientIp(req));
                String ua = req.getHeader("User-Agent");
                if (ua != null) event.setUserAgent(ua.length() > 512 ? ua.substring(0, 512) : ua);
            }
            event.setMetadata(metadata);
            repository.save(event);
        } catch (Exception e) {
            // Auditing must never break the user request — log and swallow.
            log.warn("Failed to record audit event {} for user {}", eventType, userId, e);
        }
    }

    public void record(UUID userId, String eventType) {
        record(userId, eventType, null);
    }

    private static HttpServletRequest currentRequest() {
        try {
            var attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes sra) {
                return sra.getRequest();
            }
        } catch (Exception ignored) {
            // Outside a request context (startup, scheduled task) — fine, no IP/UA to capture.
        }
        return null;
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
}
