package com.brooks.community.dto;

import java.util.List;
import java.util.UUID;

/**
 * A question plus its answers. {@code suppressedForAnonymity} is true when too few distinct
 * responders have answered to safely show them (k-anonymity — defeats the low-traffic
 * intersection de-anonymisation from RedTeam §9.1). No asker identity is ever included.
 */
public record QuestionView(
        UUID id,
        UUID placeId,
        String presetKey,
        String bodyText,
        boolean freeText,
        String freshness,
        boolean suppressedForAnonymity,
        List<AnswerView> answers
) {
}
