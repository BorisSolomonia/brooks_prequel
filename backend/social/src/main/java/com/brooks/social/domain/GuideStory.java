package com.brooks.social.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guide_stories")
@Getter
@Setter
@NoArgsConstructor
public class GuideStory extends BaseEntity {

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "caption", length = 200)
    private String caption;

    @Column(name = "link_guide_id")
    private UUID linkGuideId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "view_count", nullable = false)
    private int viewCount = 0;
}
