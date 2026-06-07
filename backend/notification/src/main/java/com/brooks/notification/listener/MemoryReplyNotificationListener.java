package com.brooks.notification.listener;

import com.brooks.common.event.MemoryReplyCreatedEvent;
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
 * Notifies a memory's creator when someone adds a reply memory to it:
 * "[replier] added their memory to yours!". Mirrors the direct-share listener — fires after the
 * publishing (memory) transaction commits; NotificationService.notifyUser is @Async.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MemoryReplyNotificationListener {

    private final NotificationService notificationService;
    private final UserService userService;
    private final UserProfileRepository userProfileRepository;

    @EventListener
    public void onMemoryReply(MemoryReplyCreatedEvent event) {
        try {
            User replier = userService.findById(event.replierUserId());
            UserProfile replierProfile =
                    userProfileRepository.findByUserId(event.replierUserId()).orElse(null);
            String replierLabel = DisplayLabel.forUser(replier, replierProfile);
            String title = replierLabel + " added their memory to yours!";
            String body = "Tap to see what they added at your spot.";

            Map<String, String> data = new HashMap<>();
            data.put("type", "memory.reply");
            // Deep-link to the ORIGINAL memory (the thread root the recipient owns).
            data.put("memoryId", event.parentMemoryId().toString());
            data.put("replyId", event.replyMemoryId().toString());
            data.put("replierId", event.replierUserId().toString());
            String replierUsername = replier.getUsername();
            if (replierUsername != null && !replierUsername.isBlank()) {
                data.put("replierUsername", replierUsername);
            }

            notificationService.notifyUser(event.parentCreatorUserId(), title, body, data);
        } catch (Exception ex) {
            // Push is best-effort; never fail the originating transaction.
            log.warn("Failed to enqueue memory reply notification: {}", ex.getMessage());
        }
    }
}
