package com.brooks.community.dto;

import java.util.UUID;

public record ReportCreatedResponse(
        UUID id,
        String statusEffective,
        long expiresInMinutes
) {
}
