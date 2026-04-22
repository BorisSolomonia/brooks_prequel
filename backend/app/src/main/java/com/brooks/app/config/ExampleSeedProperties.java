package com.brooks.app.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.seed.example")
@Getter
@Setter
public class ExampleSeedProperties {

    private boolean enabled = true;
    private String auth0Subject;
    private String email;
    private String username;
    private String displayName;
    private String bio;
    private String avatarUrl;
    private String region;
    private String interests;
    private Double latitude;
    private Double longitude;
    private Integer followerCount;
    private Integer followingCount;
    private Boolean verified;

    private String guideTitle;
    private String guideSummary;
    private String guideCity;
    private String guideCountry;
    private String guideCoverImageUrl;
    private Integer guidePriceCents;
    private String guideCurrency;
    private List<String> guideTags = new ArrayList<>();

    private String dayTitle;
    private String dayDescription;
    private String blockTitle;
    private String blockDescription;
    private String blockType;

    private String placeName;
    private String placeDescription;
    private String placeAddress;
    private Double placeLatitude;
    private Double placeLongitude;
    private String placeCategory;
    private Integer placePriceLevel;
    private String placeImageUrl;

    public void validate() {
        if (!enabled) {
            return;
        }

        List<String> missing = new ArrayList<>();
        requireText(auth0Subject, "SEED_EXAMPLE_AUTH0_SUBJECT", missing);
        requireText(email, "SEED_EXAMPLE_EMAIL", missing);
        requireText(username, "SEED_EXAMPLE_USERNAME", missing);
        requireText(displayName, "SEED_EXAMPLE_DISPLAY_NAME", missing);
        requireText(bio, "SEED_EXAMPLE_BIO", missing);
        requireText(avatarUrl, "SEED_EXAMPLE_AVATAR_URL", missing);
        requireText(region, "SEED_EXAMPLE_REGION", missing);
        requireNumber(latitude, "SEED_EXAMPLE_LATITUDE", missing);
        requireNumber(longitude, "SEED_EXAMPLE_LONGITUDE", missing);
        requireNumber(followerCount, "SEED_EXAMPLE_FOLLOWER_COUNT", missing);
        requireNumber(followingCount, "SEED_EXAMPLE_FOLLOWING_COUNT", missing);
        requireBoolean(verified, "SEED_EXAMPLE_VERIFIED", missing);
        requireText(guideTitle, "SEED_EXAMPLE_GUIDE_TITLE", missing);
        requireText(guideSummary, "SEED_EXAMPLE_GUIDE_SUMMARY", missing);
        requireText(guideCity, "SEED_EXAMPLE_GUIDE_CITY", missing);
        requireText(guideCountry, "SEED_EXAMPLE_GUIDE_COUNTRY", missing);
        requireText(guideCoverImageUrl, "SEED_EXAMPLE_GUIDE_COVER_IMAGE_URL", missing);
        requireNumber(guidePriceCents, "SEED_EXAMPLE_GUIDE_PRICE_CENTS", missing);
        requireText(guideCurrency, "SEED_EXAMPLE_GUIDE_CURRENCY", missing);
        if (guideTags == null || guideTags.stream().map(String::trim).filter(tag -> !tag.isEmpty()).toList().isEmpty()) {
            missing.add("SEED_EXAMPLE_GUIDE_TAGS");
        }
        requireText(dayTitle, "SEED_EXAMPLE_DAY_TITLE", missing);
        requireText(dayDescription, "SEED_EXAMPLE_DAY_DESCRIPTION", missing);
        requireText(blockTitle, "SEED_EXAMPLE_BLOCK_TITLE", missing);
        requireText(blockDescription, "SEED_EXAMPLE_BLOCK_DESCRIPTION", missing);
        requireText(blockType, "SEED_EXAMPLE_BLOCK_TYPE", missing);
        requireText(placeName, "SEED_EXAMPLE_PLACE_NAME", missing);
        requireText(placeDescription, "SEED_EXAMPLE_PLACE_DESCRIPTION", missing);
        requireText(placeAddress, "SEED_EXAMPLE_PLACE_ADDRESS", missing);
        requireText(placeCategory, "SEED_EXAMPLE_PLACE_CATEGORY", missing);
        requireText(placeImageUrl, "SEED_EXAMPLE_PLACE_IMAGE_URL", missing);

        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "Example creator seed is enabled but required variables are missing: " + String.join(", ", missing));
        }
    }

    public double resolvedPlaceLatitude() {
        return placeLatitude != null ? placeLatitude : latitude;
    }

    public double resolvedPlaceLongitude() {
        return placeLongitude != null ? placeLongitude : longitude;
    }

    private void requireText(String value, String name, List<String> missing) {
        if (value == null || value.isBlank()) {
            missing.add(name);
        }
    }

    private void requireNumber(Number value, String name, List<String> missing) {
        if (value == null) {
            missing.add(name);
        }
    }

    private void requireBoolean(Boolean value, String name, List<String> missing) {
        if (value == null) {
            missing.add(name);
        }
    }
}
