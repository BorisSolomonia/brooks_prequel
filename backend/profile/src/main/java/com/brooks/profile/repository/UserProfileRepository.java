package com.brooks.profile.repository;

import com.brooks.profile.domain.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {
    Optional<UserProfile> findByUserId(UUID userId);

    List<UserProfile> findAllByUserIdIn(Collection<UUID> userIds);

    @Query(value = """
        SELECT u.id AS userId, u.username, p.display_name AS displayName,
               p.avatar_url AS avatarUrl, p.bio, p.region,
               p.latitude, p.longitude,
               p.follower_count AS followerCount, p.guide_count AS guideCount,
               g.id AS guideId, g.title AS guideTitle, g.primary_city AS guidePrimaryCity,
               g.country AS guideCountry, g.price_cents AS guidePriceCents,
               g.day_count AS guideDayCount, g.place_count AS guidePlaceCount,
               p.is_verified AS verified, p.creator_rating_average AS creatorRatingAverage,
               ROW_NUMBER() OVER (
                   ORDER BY p.follower_count DESC, p.guide_count DESC,
                            p.is_verified DESC, u.created_at ASC
               ) AS rank
        FROM user_profiles p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN LATERAL (
            SELECT g.id, g.title, g.primary_city, g.country, g.price_cents, g.day_count, g.place_count
            FROM guides g
            WHERE g.creator_id = u.id
              AND g.status = 'PUBLISHED'
            ORDER BY g.updated_at DESC, g.created_at DESC
            LIMIT 1
        ) g ON TRUE
        WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
          AND u.status = 'ACTIVE'
          AND u.username IS NOT NULL AND u.username != ''
          AND (p.guide_count > 0 OR p.is_verified = TRUE)
          AND (:region IS NULL OR p.region = :region)
        ORDER BY p.follower_count DESC, p.guide_count DESC,
                 p.is_verified DESC, u.created_at ASC
        """, nativeQuery = true)
    List<InfluencerMapProjection> findInfluencerPins(@Param("region") String region);

    @Modifying
    @Query("""
        UPDATE UserProfile p
        SET p.creatorRatingAverage = :averageRating,
            p.creatorReviewCount = :reviewCount
        WHERE p.userId = :userId
        """)
    void updateCreatorReviewSummary(@Param("userId") UUID userId,
                                    @Param("averageRating") double averageRating,
                                    @Param("reviewCount") int reviewCount);

    interface InfluencerMapProjection {
        UUID getUserId();
        String getUsername();
        String getDisplayName();
        String getAvatarUrl();
        String getBio();
        String getRegion();
        Double getLatitude();
        Double getLongitude();
        int getFollowerCount();
        int getGuideCount();
        UUID getGuideId();
        String getGuideTitle();
        String getGuidePrimaryCity();
        String getGuideCountry();
        Integer getGuidePriceCents();
        Integer getGuideDayCount();
        Integer getGuidePlaceCount();
        boolean getVerified();
        double getCreatorRatingAverage();
        int getRank();
    }
}
