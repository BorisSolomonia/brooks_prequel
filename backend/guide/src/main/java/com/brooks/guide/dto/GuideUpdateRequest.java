package com.brooks.guide.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
public class GuideUpdateRequest {

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

    private Integer priceCents;
    private String currency;
    private Integer salePriceCents;
    private Instant saleEndsAt;
    private List<String> tags;
    private List<String> categoryIds;
    private Integer sortOrder;

    private Integer bestSeasonStartMonth;
    private Integer bestSeasonEndMonth;

    @Size(max = 60)
    private String bestSeasonLabel;

    @Size(max = 20)
    private String travelerStage;

    private List<String> personas;

    private Double latitude;

    private Double longitude;
}
