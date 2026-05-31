package com.brooks.ai.dto;

import com.brooks.ai.provider.AiProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request for the "Add a hook" AI description generator on the guide editor. Stateless — it does
 * NOT require a saved guide, so it works during guide creation (before first save). The AI drafts
 * a compelling guide description from the title; {@code currentDraft} + {@code instruction} drive
 * the edit-and-resend refinement loop.
 */
public record GuideHookRequest(
        @NotNull AiProvider provider,
        @NotBlank String title,
        // The user's current/edited description, if any — sent back so the AI refines it.
        String currentDraft,
        // Optional "make it bolder", "shorter", "mention the food scene", etc.
        String instruction,
        // Optional location context to ground the copy.
        String city,
        String region
) {}
