package com.brooks.community.dto;

import jakarta.validation.constraints.Size;

/**
 * Ask a place a question. Remote-allowed (D-2) — no coordinates, no presence. Exactly one of
 * {@code presetKey} or {@code bodyText} is required (validated in the service). Free-text bodies
 * are person-targeting-guarded before storage (§9.1).
 */
public record AskQuestionRequest(
        String presetKey,
        @Size(max = 140) String bodyText
) {
}
