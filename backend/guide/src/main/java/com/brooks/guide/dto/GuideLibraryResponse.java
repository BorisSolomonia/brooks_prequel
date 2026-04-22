package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class GuideLibraryResponse {
    private List<GuideLibraryItemResponse> created;
    private List<GuideLibraryItemResponse> saved;
    private List<GuideLibraryItemResponse> purchased;
}
