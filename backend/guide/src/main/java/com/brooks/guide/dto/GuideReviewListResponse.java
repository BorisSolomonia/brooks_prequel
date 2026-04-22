package com.brooks.guide.dto;

import com.brooks.common.dto.PageResponse;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GuideReviewListResponse {
    private double averageRating;
    private long reviewCount;
    private boolean canReview;
    private int reviewTextLimit;
    private GuideReviewResponse myReview;
    private PageResponse<GuideReviewResponse> reviews;
}
