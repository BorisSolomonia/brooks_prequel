package com.brooks.community.dto;

import java.util.UUID;

/** Result of posting a Moment: when it reveals (delay) and when it expires. */
public record MomentCreatedResponse(
        UUID id,
        long visibleInMinutes,
        long expiresInMinutes
) {
}
