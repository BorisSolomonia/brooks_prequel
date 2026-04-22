package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GuideSaveStatusResponse {
    private boolean saved;
}
