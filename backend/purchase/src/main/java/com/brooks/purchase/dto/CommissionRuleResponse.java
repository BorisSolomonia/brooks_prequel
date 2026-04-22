package com.brooks.purchase.dto;

import com.brooks.purchase.domain.CommissionRule;
import com.brooks.purchase.domain.CommissionRuleType;

import java.time.Instant;
import java.util.UUID;

public record CommissionRuleResponse(
        UUID id,
        CommissionRuleType ruleType,
        String region,
        UUID creatorId,
        int rateBps,
        boolean active,
        String notes,
        Instant createdAt
) {
    public static CommissionRuleResponse from(CommissionRule rule) {
        return new CommissionRuleResponse(
                rule.getId(),
                rule.getRuleType(),
                rule.getRegion(),
                rule.getCreatorId(),
                rule.getRateBps(),
                rule.isActive(),
                rule.getNotes(),
                rule.getCreatedAt()
        );
    }
}
