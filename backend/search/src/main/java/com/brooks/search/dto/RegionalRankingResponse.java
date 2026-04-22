package com.brooks.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class RegionalRankingResponse {
    private String region;
    private List<RankedCreator> creators;
    private long total;
}
