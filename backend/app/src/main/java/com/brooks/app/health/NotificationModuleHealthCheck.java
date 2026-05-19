package com.brooks.app.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Backstop for the "module silently absent from the JAR" failure mode
 * (see settings.gradle.kts header comment for the 2026-05-19 incident).
 *
 * Runs once at ApplicationReadyEvent. Verifies that beans known to live
 * in the notification module are actually registered in the Spring
 * context. If any is missing, logs a CRITICAL warning so it's obvious
 * in startup logs that this build is broken — without crashing the
 * whole app (other modules may still be useful).
 *
 * This is a SECOND line of defense. The first is the assertion in
 * backend/settings.gradle.kts that fails the build if a module
 * directory is missing. This catches the case where the directory
 * exists but is empty/misconfigured.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationModuleHealthCheck {

    private final ApplicationContext context;

    /**
     * Beans that MUST exist for the notification feature to function.
     * Add to this list when shipping new notification-module
     * controllers/listeners.
     */
    private static final List<String> CRITICAL_BEANS = List.of(
            "deviceTokenController",
            "inAppNotificationController",
            "followNotificationListener",
            "directMemoryShareNotificationListener",
            "fcmSender",
            "notificationService"
    );

    @EventListener(ApplicationReadyEvent.class)
    public void verifyOnReady() {
        List<String> missing = CRITICAL_BEANS.stream()
                .filter(name -> !context.containsBean(name))
                .toList();
        if (missing.isEmpty()) {
            log.info("Notification module beans verified: all {} critical beans registered.",
                    CRITICAL_BEANS.size());
            return;
        }
        log.error("====================================================================");
        log.error("CRITICAL: notification module beans MISSING from Spring context: {}", missing);
        log.error("This means:");
        log.error("  • POST /api/me/device-tokens will return 500");
        log.error("  • GET  /api/me/notifications  will return 500");
        log.error("  • Follow + memory-share events will NOT push notifications");
        log.error("Likely cause: notification/ directory not copied into the Docker");
        log.error("build context. Check backend/Dockerfile for the line:");
        log.error("    COPY notification/ notification/");
        log.error("between the COPY ai/ and COPY app/ lines. See the comment block");
        log.error("at the top of backend/settings.gradle.kts for full context.");
        log.error("====================================================================");
    }
}
