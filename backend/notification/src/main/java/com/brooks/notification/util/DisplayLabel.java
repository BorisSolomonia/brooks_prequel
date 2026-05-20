package com.brooks.notification.util;

import com.brooks.user.domain.User;

/**
 * Picks the best human-readable identifier for a User when building
 * notification text. Ladder:
 *   1. @username                  — preferred, profile-style handle
 *   2. @email-local-part          — e.g. "@borissolomonia" from
 *                                   borissolomoniaphone@gmail.com; works for
 *                                   users who signed up via Auth0 social but
 *                                   never picked a handle
 *   3. "Someone"                  — last resort; signals to the recipient
 *                                   that this came from a real user we just
 *                                   couldn't name
 *
 * Centralised here so every listener that builds a notification title shares
 * the same fallback behaviour. Previously each listener inlined its own
 * "username null? Someone" check, which left several flows showing the
 * unhelpful "Someone" label even when a derivable email-prefix was available.
 */
public final class DisplayLabel {

    private DisplayLabel() {}

    private static final String SYNTHETIC_EMAIL_DOMAIN = "@noemail.brooks.local";

    public static String forUser(User user) {
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
        // After the V51 migration every account has a real username so
        // this branch is mostly dead code, but it stays as defence in
        // depth in case a future signup path skips the auto-assignment.
        String email = user.getEmail();
        if (email != null && email.contains("@") && !email.endsWith(SYNTHETIC_EMAIL_DOMAIN)) {
            String local = email.substring(0, email.indexOf('@')).trim();
            if (!local.isBlank()) {
                return "@" + local;
            }
        }
        return "Someone";
    }
}
