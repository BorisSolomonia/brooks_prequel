package com.brooks.guide.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GuideBlockRequest {

    @Size(max = 200)
    private String title;

    private String description;
    private String blockType = "ACTIVITY";
    private String blockCategory = "ACTIVITY";
    private Integer suggestedStartMinute;
}
