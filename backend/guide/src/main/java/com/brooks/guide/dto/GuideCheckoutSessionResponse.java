package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class GuideCheckoutSessionResponse {
    private String provider;
    private String checkoutUrl;
    private boolean alreadyOwned;
    private UUID tripId;
}
