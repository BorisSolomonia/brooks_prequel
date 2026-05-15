package com.brooks.guide.listener;

import com.brooks.guide.repository.UserCalendarConnectionRepository;
import com.brooks.user.event.UserDeletedEvent;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Listens for {@link UserDeletedEvent} and removes the deleted user's
 * Google Calendar OAuth tokens. The privacy policy promises that
 * "Encrypted OAuth refresh tokens are deleted immediately upon disconnect
 * or account deletion" — this listener honours that.
 *
 * <p>Idempotent: a missing connection row is a no-op.
 *
 * <p>TODO: in a follow-up, also call Google's OAuth revocation endpoint so
 * Google itself invalidates the stored token. For now we only remove our copy.
 */
@Component
@RequiredArgsConstructor
public class UserDeletedCalendarCleanupListener {

    private static final Logger log = LoggerFactory.getLogger(UserDeletedCalendarCleanupListener.class);
    private static final String GOOGLE_PROVIDER = "google";

    private final UserCalendarConnectionRepository connectionRepository;

    @EventListener
    @Transactional
    public void onUserDeleted(UserDeletedEvent event) {
        try {
            connectionRepository.deleteByUserIdAndProvider(event.userId(), GOOGLE_PROVIDER);
            log.info("Revoked Google Calendar token rows for deleted user {}", event.userId());
        } catch (Exception ex) {
            // Don't propagate — the user is already DELETED at this point;
            // worst case we leak an encrypted token row, fixable later.
            log.warn("Failed to remove calendar token for user {}: {}", event.userId(), ex.toString());
        }
    }
}
