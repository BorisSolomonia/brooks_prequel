package com.brooks.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class UnifiedSearchResponse {
    private String query;
    private List<CreatorSearchResult> creators;
    private long creatorsTotalCount;
    private List<GuideSearchResult> guides;
    private long guidesTotalCount;
    private List<PlaceSearchResult> places;
    private long placesTotalCount;
}
