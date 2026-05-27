package com.brooks.notification.listener;

import com.brooks.common.event.GuideGiftedEvent;
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
 * Pushes a "sent you a guide" notification to the recipient when a creator
 * gifts them a guide for free. The gift is a PENDING offer until the recipient
 * accepts; the notification deep-links to the /gifts inbox (type "guide.gift").
 *
 * Mirrors DirectMemoryShareNotificationListener: plain @EventListener fires
 * after the publishing @Transactional method commits, and
 * NotificationService.notifyUser is @Async so this stays cheap.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GuideGiftNotificationListener {

    private final NotificationService notificationService;
    private final UserService userService;
    private final UserProfileRepository userProfileRepository;

    @EventListener
    public void onGuideGifted(GuideGiftedEvent event) {
        try {
            User creator = userService.findById(event.creatorUserId());
            UserProfile creatorProfile =
                    userProfileRepository.findByUserId(event.creatorUserId()).orElse(null);
            String gifterLabel = DisplayLabel.forUser(creator, creatorProfile);

            String title = gifterLabel + " sent you a guide";
            String body = event.guideTitle() == null || event.guideTitle().isBlank()
                    ? "Open Brooks to accept your free guide."
                    : "\"" + event.guideTitle() + "\" — accept it to add it to your trips.";

            Map<String, String> data = new HashMap<>();
            data.put("type", "guide.gift");
            data.put("guideId", event.guideId().toString());
            data.put("purchaseId", event.purchaseId().toString());
            String creatorUsername = creator.getUsername();
            if (creatorUsername != null && !creatorUsername.isBlank()) {
                data.put("creatorUsername", creatorUsername);
            }

            notificationService.notifyUser(event.recipientUserId(), title, body, data);
        } catch (Exception ex) {
            // Push is best-effort; never fail the originating transaction.
            log.warn("Failed to enqueue guide gift notification: {}", ex.getMessage());
        }
    }
}
