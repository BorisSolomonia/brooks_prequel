package com.brooks.community.domain;

import java.util.List;

/**
 * Why a viewer flagged a report. Critical categories auto-hide the report pending human review;
 * the rest soft down-rank on a normal SLA. Severity lives on the constant so a new category must
 * declare it (no out-of-band Set to keep in sync).
 */
public enum FlagCategory {
    MISLEADING(false),
    OUTDATED(false),
    UNSAFE(true),
    HARASSMENT(true),
    ILLEGAL(true),
    OTHER(false);

    private final boolean critical;

    FlagCategory(boolean critical) {
        this.critical = critical;
    }

    /** Critical flags auto-hide the report immediately, pending human review. */
    public boolean critical() {
        return critical;
    }

    /** Non-critical categories, whose distinct-reporter count drives threshold auto-hide. */
    public static List<FlagCategory> nonCritical() {
        return List.of(MISLEADING, OUTDATED, OTHER);
    }
}
