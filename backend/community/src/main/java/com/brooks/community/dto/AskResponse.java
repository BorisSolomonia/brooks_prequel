package com.brooks.community.dto;

import java.util.UUID;

public record AskResponse(
        UUID placeId,
        String demand,            // bucket key or null when below K_count
        long expiresInMinutes
) {
}
