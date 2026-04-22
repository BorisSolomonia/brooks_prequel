package com.brooks.guide.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreatorReviewRequest {

    @NotNull
    @Min(1)
    @Max(5)
    private Short rating;

    @Size(max = 250)
    private String reviewText;
}
