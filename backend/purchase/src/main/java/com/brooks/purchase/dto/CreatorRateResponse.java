package com.brooks.purchase.dto;

import java.util.UUID;

public record CreatorRateResponse(
        UUID userId,
        String username,
        String displayName,
        String region,
        boolean verified,
        int followerCount,
        int effectiveRateBps,
        String rateSource
) {}
