package com.brooks.user.domain;

/**
 * The user's self-selected primary intent, chosen once right after first sign-in. Drives which
 * onboarding path runs. Distinct from {@link UserRole} (the system auth role) on purpose — this is
 * a UX preference, not a permission. Null = not yet chosen (show the role-selection prompt).
 */
public enum PrimaryIntent {
    TRAVELER,
    CREATOR
}
