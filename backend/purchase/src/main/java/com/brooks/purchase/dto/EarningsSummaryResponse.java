package com.brooks.purchase.dto;

import java.util.List;
import java.util.UUID;

public record EarningsSummaryResponse(
        long totalGrossCents,
        long totalCommissionCents,
        long totalNetCents,
        List<CreatorEarningsSummary> byCreator
) {
    public record CreatorEarningsSummary(
            UUID creatorId,
            long grossCents,
            long commissionCents,
            long netCents
    ) {}
}
