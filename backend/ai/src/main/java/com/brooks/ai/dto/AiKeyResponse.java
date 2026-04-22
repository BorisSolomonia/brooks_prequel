package com.brooks.ai.dto;

import com.brooks.ai.provider.AiProvider;

import java.time.Instant;

public record AiKeyResponse(
        AiProvider provider,
        String keyHint,
        String selectedModel,
        Instant updatedAt
) {}
