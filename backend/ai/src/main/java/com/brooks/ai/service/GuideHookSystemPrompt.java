package com.brooks.ai.service;

import com.brooks.ai.dto.GuideHookRequest;

/**
 * System + user prompt builder for the "Add a hook" guide-description generator. The model must
 * return ONLY the description text (no preamble, quotes, options or markdown) so the client can
 * drop the streamed output straight into the description field.
 */
public final class GuideHookSystemPrompt {

    private GuideHookSystemPrompt() {}

    static String system() {
        return """
            You are an expert travel copywriter helping a creator write the DESCRIPTION for a paid \
            travel guide. Given the guide's title (and any location, current draft, or revision \
            request), write ONE vivid, specific, compelling description.

            Rules:
            - Lead with the hook — what makes this guide unmissable. Give a concrete, surprising, \
            or contrarian angle, not a generic summary.
            - 2 to 4 sentences. Roughly 30 to 70 words.
            - Be concrete and sensory. NEVER use empty adjectives like amazing, beautiful, great, \
            wonderful, awesome, incredible, perfect.
            - Write in the creator's confident first-person/editorial voice; speak to a traveler \
            deciding whether to buy.
            - If a current draft is provided, improve THAT text; if a revision request is provided, \
            apply it precisely.
            - Output ONLY the final description text. No preamble, no labels, no quotation marks, \
            no markdown, no multiple options.""";
    }

    static String user(GuideHookRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("Guide title: \"").append(req.title().trim()).append("\".\n");

        String city = req.city() == null ? "" : req.city().trim();
        String region = req.region() == null ? "" : req.region().trim();
        if (!city.isEmpty() || !region.isEmpty()) {
            sb.append("Location: ");
            sb.append(city);
            if (!city.isEmpty() && !region.isEmpty()) sb.append(", ");
            sb.append(region);
            sb.append(".\n");
        }

        String draft = req.currentDraft() == null ? "" : req.currentDraft().trim();
        if (!draft.isEmpty()) {
            sb.append("Current description draft to improve: \"").append(draft).append("\".\n");
        }

        String instruction = req.instruction() == null ? "" : req.instruction().trim();
        if (!instruction.isEmpty()) {
            sb.append("Requested change: ").append(instruction).append(".\n");
        }

        sb.append("Write the guide description now.");
        return sb.toString();
    }
}
