package com.brooks.community.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Answer a question. Present-only (§9.2): latitude/longitude/accuracy are consumed in memory for
 * the eligibility check and then discarded. At least one of body/statusChip is required.
 */
public record AnswerRequest(
        @Size(max = 280) String bodyText,
        @Size(max = 20) String statusChip,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Double accuracyMeters,
        String attestationToken,
        Integer dwellSeconds
) {
}
