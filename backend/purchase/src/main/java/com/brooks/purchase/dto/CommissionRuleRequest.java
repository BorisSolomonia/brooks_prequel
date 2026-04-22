package com.brooks.purchase.dto;

import com.brooks.purchase.domain.CommissionRuleType;

import java.util.UUID;

public record CommissionRuleRequest(
        CommissionRuleType ruleType,
        String region,
        UUID creatorId,
        int rateBps,
        String notes
) {}
