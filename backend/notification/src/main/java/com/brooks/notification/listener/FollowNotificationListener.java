package com.brooks.notification.listener;

import com.brooks.notification.service.NotificationService;
import com.brooks.notification.util.DisplayLabel;
import com.brooks.social.event.FollowEvent;
import com.brooks.user.domain.User;
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
            User follower = userService.findById(event.getFollowerId());
            // Title prefers @username; if the follower hasn't set one yet,
            // fall back to the email prefix (the part before @) so the
            // notification reads "@borissolomonia started following you"
            // instead of the previous unhelpful "Someone started following
            // you". DisplayLabel centralises this so memory-share + future
            // listeners share the same fallback ladder.
            String title = DisplayLabel.forUser(follower) + " started following you";
            // followerUsername is the source of truth for deep-linking. Empty
            // when the user truly has no username — frontend then routes to
            // /search/creators (a useful page) rather than /maps (a dead end).
            String safeUsername = follower.getUsername() == null ? "" : follower.getUsername();
            notificationService.notifyUser(
                    event.getFollowingId(),
                    title,
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
