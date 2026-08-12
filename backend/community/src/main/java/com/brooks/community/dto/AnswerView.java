package com.brooks.community.dto;

import java.util.UUID;

/**
 * An anonymous answer as shown to clients. Carries NO author id, NO exact timestamp, and NO raw
 * helpful count — only coarse trust/corroboration/freshness signals (mirrors Right Now v1).
 */
public record AnswerView(
        UUID id,
        String bodyText,
        String statusChip,
        String freshness,
        boolean corroborated,
        String contributorTier   // "TRUSTED" or null — never a count
) {
}
