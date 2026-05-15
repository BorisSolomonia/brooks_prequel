package com.brooks.user.domain;

/**
 * Where a completed account deletion was initiated from.
 */
public enum AccountDeletionSource {
    /** Authenticated user pressed Delete in Settings inside the app/web. */
    INAPP,
    /** Public unauthenticated flow, completed via emailed confirmation link. */
    WEB,
    /** Manually triggered by admin / support staff. */
    SUPPORT
}
