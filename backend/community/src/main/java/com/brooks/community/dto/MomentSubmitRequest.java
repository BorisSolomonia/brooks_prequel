package com.brooks.community.dto;

import com.brooks.community.domain.MomentMediaType;
import com.brooks.community.domain.MomentVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Post a Moment. Presence is proven exactly like a Right Now answer: latitude/longitude/accuracy
 * are consumed IN MEMORY for the eligibility check and then discarded — never stored or logged.
 * The optional device/install/session fields feed the dormant fraud-forensic ledger (§7).
 */
public record MomentSubmitRequest(
        @NotBlank String mediaRef,
        @NotNull MomentMediaType mediaType,
        @Size(max = 280) String caption,
        MomentVisibility visibility,          // null → FOLLOWERS
        Integer delayMinutes,                 // null → 0; jittered client-side
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Double accuracyMeters,
        String attestationToken,
        Integer dwellSeconds,
        // Fraud-forensic client signals (nullable) — recorded, never trusted for eligibility.
        String deviceId,
        String installId,
        String sessionId
) {
}
