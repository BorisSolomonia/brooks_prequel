package com.brooks.guide.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class GuideCreateRequest {

    @NotBlank
    @Size(max = 200)
    private String title;

    private String description;
    private String coverImageUrl;

    @Size(max = 100)
    private String region;

    @Size(max = 100)
    private String primaryCity;

    @Size(max = 100)
    private String country;

    @Size(max = 80)
    private String timezone;

    private int priceCents = 0;
    private String currency = "USD";
    private List<String> tags;
    private List<String> categoryIds;
}
