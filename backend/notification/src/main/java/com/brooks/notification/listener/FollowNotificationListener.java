package com.brooks.notification.listener;

import com.brooks.notification.service.NotificationService;
import com.brooks.social.event.FollowEvent;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Pushes "X started following you" notification when a new follow row
 * is created. Skips the unfollow event (FollowEvent.followed == false).
 *
 * Designed to be additive — does NOT block the follow transaction if
 * notification dispatch fails (NotificationService.notifyUser is @Async
 * and the catch here swallows all errors).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FollowNotificationListener {

    private final NotificationService notificationService;
    private final UserService userService;

    @EventListener
    public void onFollow(FollowEvent event) {
        if (!event.isFollowed()) {
            // Unfollow event — no notification needed.
            return;
        }
        try {
            String followerName = userService.findById(event.getFollowerId()).getUsername();
            String displayName = (followerName == null || followerName.isBlank())
                    ? "Someone"
                    : "@" + followerName;
            // followerUsername is included so the in-app bell tap and the
            // system-tray push tap can both deep-link to /creators/{username}
            // without a second backend round-trip. Falls back to "" when the
            // user has no username yet (rare, but possible during onboarding);
            // the frontend handles the empty case by routing to /maps.
            String safeUsername = followerName == null ? "" : followerName;
            notificationService.notifyUser(
                    event.getFollowingId(),
                    displayName + " started following you",
                    "Tap to view their profile.",
                    Map.of(
                            "type", "follow",
                            "followerId", event.getFollowerId().toString(),
                            "followerUsername", safeUsername
                    )
            );
        } catch (Exception ex) {
            log.warn("Failed to enqueue follow notification: {}", ex.getMessage());
        }
    }
}
