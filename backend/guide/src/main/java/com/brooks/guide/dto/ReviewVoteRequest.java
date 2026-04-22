package com.brooks.guide.dto;

import com.brooks.guide.domain.ReviewVoteValue;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReviewVoteRequest {

    @NotNull
    private ReviewVoteValue vote;
}
