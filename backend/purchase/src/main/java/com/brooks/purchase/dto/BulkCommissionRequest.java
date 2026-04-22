package com.brooks.purchase.dto;

import java.util.List;
import java.util.UUID;

public record BulkCommissionRequest(
        List<UUID> creatorIds,
        int rateBps,
        String notes
) {}
