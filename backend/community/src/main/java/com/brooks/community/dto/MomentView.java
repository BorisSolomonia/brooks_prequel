package com.brooks.community.dto;

import com.brooks.community.domain.MomentMediaType;

import java.util.UUID;

/**
 * A Moment as seen by an authorized follower. {@code authorId} IS exposed (stories are identified
 * to their audience); the client resolves it to a handle/avatar via the profile API. Freshness is
 * a coarse key, never an exact timestamp.
 */
public record MomentView(
        UUID id,
        UUID placeId,
        UUID authorId,
        String authorName,
        String authorAvatarUrl,
        String mediaRef,
        MomentMediaType mediaType,
        String caption,
        String freshness,
        long expiresInMinutes
) {
}
