package com.brooks.community.dto;

import java.util.UUID;

/** A public place shown on the map. The coordinate here is the PLACE's, which is public.
 *  The endpoint only ever returns v1-eligible places, so eligibility is implicit. */
public record CommunityPlaceResponse(
        UUID id,
        String name,
        String category,
        double latitude,
        double longitude,
        String footfallClass
) {
}
