package com.brooks.guide.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class GuidePlaceRequest {

    @NotBlank
    @Size(max = 200)
    private String name;

    private String description;

    @Size(max = 500)
    private String address;

    private Double latitude;
    private Double longitude;
    private String googlePlaceId;

    @Size(max = 100)
    private String category;

    private Integer priceLevel;
    private Integer suggestedStartMinute;
    private Integer suggestedDurationMinutes;
    private boolean sponsored = false;
    private List<String> imageUrls;
}
