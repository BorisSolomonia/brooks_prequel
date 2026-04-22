package com.brooks.purchase.dto;

import com.brooks.purchase.domain.PromotionTargetType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PromotionRequest(
        String name,
        String description,
        int rateBps,
        PromotionTargetType targetType,
        String region,
        List<UUID> creatorIds,
        Instant startsAt,
        Instant endsAt
) {}
