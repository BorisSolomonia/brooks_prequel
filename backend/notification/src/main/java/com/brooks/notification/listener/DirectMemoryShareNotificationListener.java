package com.brooks.notification.listener;

import com.brooks.common.event.DirectMemoryShareCreatedEvent;
import com.brooks.notification.service.NotificationService;
import com.brooks.notification.util.DisplayLabel;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Pushes a "shared a memory with you" notification to the recipient
 * when a creator directly shares a memory with one of their followers.
 *
 * Listens for the @TransactionalEventListener-equivalent: plain
 * @EventListener, which fires AFTER the publishing transaction commits
 * in Spring's default config (memoryDirectShareService is @Transactional
 * and publishes the event inside its method body — Spring's event
 * publisher fires after commit by default in the synchronous case).
 *
 * NotificationService.notifyUser is @Async so this listener itself
 * stays cheap.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DirectMemoryShareNotificationListener {

    private final NotificationService notificationService;
    private final UserService userService;

    @EventListener
    public void onDirectShare(DirectMemoryShareCreatedEvent event) {
        try {
            User creator = userService.findById(event.creatorUserId());
            // Same fallback ladder as the follow listener (username →
            // email-local-part → "Someone"), so a brand-new account with no
            // handle still gets a real-looking name in the push title.
            String title = DisplayLabel.forUser(creator) + " shared a memory with you";
            String body = event.memoryTextPreview() == null || event.memoryTextPreview().isBlank()
                    ? "Open Brooks to see what's nearby."
                    : event.memoryTextPreview();

            notificationService.notifyUser(
                    event.recipientUserId(),
                    title,
                    body,
                    Map.of(
                            "type", "memory.direct-share",
                            "memoryId", event.memoryId().toString(),
                            "creatorId", event.creatorUserId().toString()
                    )
            );
        } catch (Exception ex) {
            // Push is best-effort; never fail the originating transaction.
            log.warn("Failed to enqueue direct memory share notification: {}", ex.getMessage());
        }
    }
}
