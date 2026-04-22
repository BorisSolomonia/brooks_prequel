package com.brooks.ai.dto;

import com.brooks.ai.provider.AiProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record BuyerChatRequest(
        @NotNull UUID tripId,
        @NotNull AiProvider provider,
        @NotBlank String userMessage,
        List<ChatMessage> history
) {}
