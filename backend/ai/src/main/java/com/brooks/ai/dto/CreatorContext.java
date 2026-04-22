package com.brooks.ai.dto;

import java.util.List;

public record CreatorContext(
        String guideTitle,
        String description,
        String region,
        String primaryCity,
        int existingDayCount,
        List<String> existingDayTitles,
        List<DayContext> existingDays,
        String creatorProfile
) {
    public record BlockContext(
            String title,
            List<String> placeNames
    ) {}

    public record DayContext(
            int dayNumber,
            String title,
            List<BlockContext> blocks
    ) {}
}
