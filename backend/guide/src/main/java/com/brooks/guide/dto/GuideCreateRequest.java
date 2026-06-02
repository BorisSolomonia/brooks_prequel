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
    // Base/presentment currency the creator prices in (default USD). The buyer is charged in GEL,
    // converted at checkout. Validated server-side against BusinessConstants.SUPPORTED_CURRENCIES.
    private String currency = "USD";
    // Optional discount as a percentage (0-95). salePriceCents is derived server-side.
    private Integer discountPercent;
    private List<String> tags;
    private List<String> categoryIds;

    // Destination pin chosen in Stage 1 (map / city autocomplete / "use my location").
    // Must be carried on create so it survives the Stage 1 → Stage 2 (edit page) round-trip;
    // previously these were absent here, so the location was silently dropped on POST.
    private Double latitude;
    private Double longitude;

    // Stage-1 audience/seasonality metadata. Like latitude/longitude above, these were
    // previously absent from the create request (only updateGuide handled them), so the
    // selections were silently dropped when "Create Guide" was clicked.
    private String travelerStage;
    private List<String> personas;
    private Integer bestSeasonStartMonth;
    private Integer bestSeasonEndMonth;
    private String bestSeasonLabel;
}
