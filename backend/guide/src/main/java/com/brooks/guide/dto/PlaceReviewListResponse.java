package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlaceReviewListResponse {
    private boolean canReview;
    private int reviewTextLimit;
    private PlaceReviewResponse myReview;
    private List<PlaceReviewResponse> reviews;
}
