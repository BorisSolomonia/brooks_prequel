package com.brooks.guide.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GuideDayRequest {

    @Size(max = 200)
    private String title;

    private String description;
}
