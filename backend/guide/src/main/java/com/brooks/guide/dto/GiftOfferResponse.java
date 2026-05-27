package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/** A pending free-gift offer shown in the recipient's /gifts inbox. */
@Getter
@Builder
public class GiftOfferResponse {
    private UUID purchaseId;
    private UUID guideId;
    private String guideTitle;
    private String coverImageUrl;
    private String gifterName;
    private Instant createdAt;
}
