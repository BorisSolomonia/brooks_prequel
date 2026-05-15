package com.brooks.user.event;

import java.util.UUID;

/**
 * Published by {@link com.brooks.user.service.AccountDeletionService} after a
 * user has been soft-deleted + anonymised. Other modules listen and cascade
 * cleanup of their own owned data:
 *
 * <ul>
 *   <li>guide module — revoke Google Calendar OAuth tokens, soft-delete guides</li>
 *   <li>memory module — soft-delete memories</li>
 *   <li>purchase module — anonymise purchase records (retained for tax/legal)</li>
 *   <li>social module — drop follower edges</li>
 * </ul>
 *
 * <p>Each listener should be idempotent — the user row is already DELETED, so
 * the listener may be invoked more than once during retries.
 */
public record UserDeletedEvent(UUID userId) {
}
