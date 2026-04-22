package com.brooks.profile.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@NoArgsConstructor
public class UserProfile extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "bio", length = 500)
    private String bio;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "region")
    private String region;

    @Column(name = "interests")
    private String interests;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "follower_count", nullable = false)
    private int followerCount = 0;

    @Column(name = "following_count", nullable = false)
    private int followingCount = 0;

    @Column(name = "guide_count", nullable = false)
    private int guideCount = 0;

    @Column(name = "purchase_count", nullable = false)
    private int purchaseCount = 0;

    @Column(name = "is_verified", nullable = false)
    private boolean verified = false;

    @Column(name = "creator_rating_average", nullable = false)
    private double creatorRatingAverage = 0;

    @Column(name = "creator_review_count", nullable = false)
    private int creatorReviewCount = 0;

    public UserProfile(UUID userId) {
        this.userId = userId;
    }
}
