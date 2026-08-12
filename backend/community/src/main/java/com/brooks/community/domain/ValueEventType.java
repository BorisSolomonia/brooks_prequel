package com.brooks.community.domain;

/**
 * Attributable value-events recorded into the DORMANT ledger (RIGHT_NOW_V2_DESIGN.md §7).
 * Recorded now, paid later (D-6). Nothing reads these for money yet.
 */
public enum ValueEventType {
    ANSWER_HELPFUL,
    ANSWER_CORROBORATED,
    MOMENT_VIEW,
    MOMENT_UNIQUE_VIEW,
    MOMENT_REACTION
}
