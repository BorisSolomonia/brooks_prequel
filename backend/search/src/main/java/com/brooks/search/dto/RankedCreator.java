package com.brooks.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class RankedCreator {
    private int rank;
    private UUID userId;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String region;
    private int followerCount;
    private int guideCount;
    private boolean verified;
    private int score;
}
