package com.brooks.notification.listener;

import com.brooks.notification.service.NotificationService;
import com.brooks.notification.util.DisplayLabel;
import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.social.event.FollowEvent;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
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
    private final UserProfileRepository userProfileRepository;

    @EventListener
    public void onFollow(FollowEvent event) {
        if (!event.isFollowed()) {
            // Unfollow event — no notification needed.
            return;
        }
        try {
            User follower = userService.findById(event.getFollowerId());
            UserProfile followerProfile =
                    userProfileRepository.findByUserId(event.getFollowerId()).orElse(null);
            // Title prefers UserProfile.displayName (a real human name),
            // then @username, then email-prefix, then "Someone".
            // DisplayLabel centralises the ladder.
            String label = DisplayLabel.forUser(follower, followerProfile);
            String title = label + " started following you";

            // Data payload: include both the routable username (for
            // /creators/<username> deep-links) and the displayed name
            // (in case the client wants to render it elsewhere).
            Map<String, String> data = new HashMap<>();
            data.put("type", "follow");
            data.put("followerId", event.getFollowerId().toString());
            String username = follower.getUsername();
            data.put("followerUsername", username == null ? "" : username);
            String displayName = followerProfile != null ? followerProfile.getDisplayName() : null;
            if (displayName != null && !displayName.isBlank()) {
                data.put("followerDisplayName", displayName);
            }
            notificationService.notifyUser(
                    event.getFollowingId(),
                    title,
                    "Tap to view their profile.",
                    data
            );
        } catch (Exception ex) {
            log.warn("Failed to enqueue follow notification: {}", ex.getMessage());
        }
    }
}
