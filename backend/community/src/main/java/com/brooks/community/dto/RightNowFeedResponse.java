package com.brooks.community.dto;

import java.util.List;
import java.util.UUID;

/**
 * The current Right Now state for a place. When fewer than K_show distinct responders exist,
 * {@code suppressedForAnonymity} is true and {@code reports} is empty — the presence signal
 * itself is withheld to protect a lone responder.
 */
public record RightNowFeedResponse(
        UUID placeId,
        String placeName,
        String demand,                 // bucket key: few / several / many, or null when below K_count
        boolean suppressedForAnonymity,
        List<RightNowReportView> reports
) {
}
