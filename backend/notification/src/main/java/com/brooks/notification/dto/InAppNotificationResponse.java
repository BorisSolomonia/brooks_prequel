package com.brooks.notification.dto;

import com.brooks.notification.domain.InAppNotification;

import java.time.Instant;
import java.util.UUID;

public record InAppNotificationResponse(
        UUID id,
        String type,
        String title,
        String body,
        String dataJson,
        Instant readAt,
        Instant createdAt
) {
    public static InAppNotificationResponse from(InAppNotification n) {
        return new InAppNotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getBody(),
                n.getDataJson(),
                n.getReadAt(),
                n.getCreatedAt()
        );
    }
}
