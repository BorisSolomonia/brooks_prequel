package com.brooks.community.dto;

/** Optional engagement signal sent when a follower views a Moment (feeds the dormant ledger). */
public record MomentViewPing(
        Integer dwellMs,
        String sessionId
) {
}
