package com.brooks.memory.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record DirectShareRequest(
        @NotNull
        UUID recipientUserId
) {
}
