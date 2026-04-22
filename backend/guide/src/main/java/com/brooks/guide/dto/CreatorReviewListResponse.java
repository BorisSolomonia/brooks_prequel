package com.brooks.guide.dto;

import com.brooks.common.dto.PageResponse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CreatorReviewListResponse {
    private double averageRating;
    private long reviewCount;
    private boolean canReview;
    private int reviewTextLimit;
    private CreatorReviewResponse myReview;
    private PageResponse<CreatorReviewResponse> reviews;
}
