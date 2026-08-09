package com.brooks.community.dto;

import com.brooks.community.domain.RightNowStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Answer submission. latitude/longitude/accuracy are consumed IN MEMORY for the eligibility
 * check and then discarded — they are never stored or logged. Only booleans persist.
 */
public record RightNowSubmitRequest(
        @NotNull RightNowStatus status,
        String waitBucket,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Double accuracyMeters,
        // Platform attestation token (Play Integrity / App Attest). Verified server-side in prod;
        // v1 treats a present token as attested (real verification is a documented follow-up).
        String attestationToken,
        // Seconds the device has continuously dwelt within radius (client-measured, server-gated).
        Integer dwellSeconds
) {
}
