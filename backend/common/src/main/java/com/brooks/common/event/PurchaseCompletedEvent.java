package com.brooks.common.event;

import java.util.UUID;

public record PurchaseCompletedEvent(
        UUID purchaseId,
        UUID buyerId,
        UUID guideId,
        int guideVersionNumber,
        int amountCents,
        String currency
) {
}
