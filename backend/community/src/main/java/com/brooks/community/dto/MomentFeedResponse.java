package com.brooks.community.dto;

import java.util.List;
import java.util.UUID;

/** The Moments a viewer is allowed to see at a place (follower-scoped, block-filtered). */
public record MomentFeedResponse(
        UUID placeId,
        String placeName,
        List<MomentView> moments
) {
}
