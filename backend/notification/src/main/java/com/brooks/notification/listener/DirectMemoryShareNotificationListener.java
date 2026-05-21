package com.brooks.notification.listener;

import com.brooks.common.event.DirectMemoryShareCreatedEvent;
import com.brooks.notification.service.NotificationService;
import com.brooks.notification.util.DisplayLabel;
import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
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
    private final UserProfileRepository userProfileRepository;

    @EventListener
    public void onDirectShare(DirectMemoryShareCreatedEvent event) {
        try {
            User creator = userService.findById(event.creatorUserId());
            // Pull UserProfile so DisplayLabel can use the human name (set
            // either via profile editor or Auth0 `name` claim on signup if
            // that ever gets wired in). Listener stays resilient if the
            // profile row doesn't exist yet — DisplayLabel falls through
            // to @username or email-prefix.
            UserProfile creatorProfile =
                    userProfileRepository.findByUserId(event.creatorUserId()).orElse(null);
            String sharerLabel = DisplayLabel.forUser(creator, creatorProfile);
            String title = sharerLabel + " shared a memory with you";
            String body = event.memoryTextPreview() == null || event.memoryTextPreview().isBlank()
                    ? "Open Brooks to see what's nearby."
                    : event.memoryTextPreview();

            // Data payload mirrors the follow notification — we ship the
            // sharer's username explicitly so the in-app bell and the
            // system-push tap can both route to /creators/<username> if
            // the client ever surfaces a "view sharer" option.
            Map<String, String> data = new HashMap<>();
            data.put("type", "memory.direct-share");
            data.put("memoryId", event.memoryId().toString());
            data.put("creatorId", event.creatorUserId().toString());
            String creatorUsername = creator.getUsername();
            if (creatorUsername != null && !creatorUsername.isBlank()) {
                data.put("creatorUsername", creatorUsername);
            }
            String creatorDisplayName = creatorProfile != null ? creatorProfile.getDisplayName() : null;
            if (creatorDisplayName != null && !creatorDisplayName.isBlank()) {
                data.put("creatorDisplayName", creatorDisplayName);
            }
            notificationService.notifyUser(event.recipientUserId(), title, body, data);
        } catch (Exception ex) {
            // Push is best-effort; never fail the originating transaction.
            log.warn("Failed to enqueue direct memory share notification: {}", ex.getMessage());
        }
    }
}
