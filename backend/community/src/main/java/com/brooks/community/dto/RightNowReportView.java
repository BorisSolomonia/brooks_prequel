package com.brooks.community.dto;

import java.util.UUID;

/**
 * A single report as shown to a viewer. Deliberately carries NO author id, NO exact timestamp,
 * and NO numeric reputation — only a coarse freshness key and an optional trust tier. The id is
 * the report id (needed to vote/flag), not anything about the person.
 */
public record RightNowReportView(
        UUID id,
        String status,          // effective status key, e.g. QUIET / CLOSED / CLOSED_UNCONFIRMED
        String waitBucket,
        String freshness,       // coarse key: under_15_min / about_30_min / about_1_hour / over_1_hour
        String contributorTier, // TRUSTED or null — never a count
        boolean corroborated,
        boolean publicShared
) {
}
