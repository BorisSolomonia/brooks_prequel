package com.brooks.community.domain;

/**
 * Audience scope for a Location Moment (RIGHT_NOW_V2_DESIGN.md D-3). Deliberately has NO
 * PLACE_PUBLIC value — the follower-scoping is what designs out the RedTeam's public-polling
 * stalking oracle. CLOSE_FOLLOWERS is schema-ready now; its UI is deferred (Q3).
 */
public enum MomentVisibility {
    FOLLOWERS,
    CLOSE_FOLLOWERS
}
