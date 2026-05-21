package com.brooks.notification.util;

import com.brooks.profile.domain.UserProfile;
import com.brooks.user.domain.User;

/**
 * Picks the best human-readable identifier for a User when building
 * notification text. Ladder, highest to lowest priority:
 *   1. UserProfile.displayName    — the human name the user picked in
 *                                   their profile (or that Auth0 supplied
 *                                   on signup). NO @ prefix because it's
 *                                   a real name, not a handle.
 *   2. @username                  — auto-assigned or user-picked handle
 *   3. @email-local-part          — e.g. "@borissolomonia" from
 *                                   borissolomoniaphone@gmail.com; for
 *                                   accounts that lost their handle somehow
 *   4. "Someone"                  — last resort; signals to the recipient
 *                                   that this came from a real user we just
 *                                   couldn't name
 *
 * Centralised here so every listener that builds a notification title shares
 * the same fallback behaviour.
 */
public final class DisplayLabel {

    private DisplayLabel() {}

    private static final String SYNTHETIC_EMAIL_DOMAIN = "@noemail.brooks.local";

    /**
     * Pick the best label given BOTH the User row and the optional
     * UserProfile row. Pass `profile = null` when the caller doesn't have
     * a UserProfile reference (the ladder will skip step 1 and fall through).
     */
    public static String forUser(User user, UserProfile profile) {
        if (profile != null) {
            String displayName = profile.getDisplayName();
            if (displayName != null && !displayName.isBlank()) {
                return displayName;
            }
        }
        if (user == null) return "Someone";
        String username = user.getUsername();
        if (username != null && !username.isBlank()) {
            return "@" + username;
        }
        // Email-prefix fallback ONLY when the email isn't the synthesised
        // placeholder UserService.findOrCreateUser uses for Auth0 accounts
        // that didn't share a real email. Without this guard a follower
        // showed up as "@google-oauth2_<sub_id>" in notifications because
        // the synthetic email's local-part IS the sanitised Auth0 subject.
        String email = user.getEmail();
        if (email != null && email.contains("@") && !email.endsWith(SYNTHETIC_EMAIL_DOMAIN)) {
            String local = email.substring(0, email.indexOf('@')).trim();
            if (!local.isBlank()) {
                return "@" + local;
            }
        }
        return "Someone";
    }

    /** Backwards-compatible overload for callers that haven't been
     *  updated to pass UserProfile yet. New callers should pass the
     *  profile explicitly so the real display name can be used. */
    public static String forUser(User user) {
        return forUser(user, null);
    }
}
