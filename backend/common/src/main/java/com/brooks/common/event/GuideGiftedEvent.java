package com.brooks.common.event;

import java.util.UUID;

/**
 * Fired when a creator gifts a published guide to one of their followers for
 * free. The gift is created as a PENDING purchase (no access yet); the
 * notification module's listener pushes a "sent you a guide" notification to
 * the recipient, who then accepts (→ COMPLETED + trip) or declines (→ CANCELED).
 */
public record GuideGiftedEvent(
        UUID guideId,
        UUID purchaseId,
        UUID creatorUserId,
        UUID recipientUserId,
        String guideTitle
) {
}
