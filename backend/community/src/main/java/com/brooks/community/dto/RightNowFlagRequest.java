package com.brooks.community.dto;

import com.brooks.community.domain.FlagCategory;
import jakarta.validation.constraints.NotNull;

public record RightNowFlagRequest(
        @NotNull FlagCategory category
) {
}
