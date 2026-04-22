package com.brooks.social.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class FollowResponse {
    private boolean following;
    private long followerCount;
    private long followingCount;
}
