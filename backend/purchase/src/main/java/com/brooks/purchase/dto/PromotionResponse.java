package com.brooks.purchase.dto;

import com.brooks.purchase.domain.CommissionPromotion;
import com.brooks.purchase.domain.PromotionTargetType;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record PromotionResponse(
        UUID id,
        String name,
        String description,
        int rateBps,
        PromotionTargetType targetType,
        String region,
        Set<UUID> creatorIds,
        Instant startsAt,
        Instant endsAt,
        boolean active,
        Instant createdAt
) {
    public static PromotionResponse from(CommissionPromotion p) {
        return new PromotionResponse(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getRateBps(),
                p.getTargetType(),
                p.getRegion(),
                p.getCreatorIds(),
                p.getStartsAt(),
                p.getEndsAt(),
                p.isActive(),
                p.getCreatedAt()
        );
    }
}
