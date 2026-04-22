package com.brooks.ai.dto;

import com.brooks.ai.provider.AiProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SaveAiKeyRequest(
        @NotNull AiProvider provider,
        @NotBlank String rawKey,
        String model
) {}
