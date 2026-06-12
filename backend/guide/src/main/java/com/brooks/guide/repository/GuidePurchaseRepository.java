package com.brooks.guide.repository;

import com.brooks.guide.domain.GuidePurchase;
import com.brooks.guide.domain.GuidePurchaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuidePurchaseRepository extends JpaRepository<GuidePurchase, UUID> {

    List<GuidePurchase> findByBuyerIdAndStatusOrderByCreatedAtDesc(UUID buyerId, GuidePurchaseStatus status);

    Optional<GuidePurchase> findByIdAndBuyerId(UUID id, UUID buyerId);

    Optional<GuidePurchase> findByBuyerIdAndGuideVersionIdAndStatus(UUID buyerId, UUID guideVersionId, GuidePurchaseStatus status);

    Optional<GuidePurchase> findFirstByBuyerIdAndGuideIdAndStatusOrderByCreatedAtDesc(UUID buyerId, UUID guideId, GuidePurchaseStatus status);

    Optional<GuidePurchase> findFirstByBuyerIdAndGuideIdAndProviderAndStatusOrderByCreatedAtDesc(
            UUID buyerId, UUID guideId, String provider, GuidePurchaseStatus status);

    boolean existsByBuyerIdAndStatus(UUID buyerId, GuidePurchaseStatus status);

    @org.springframework.data.jpa.repository.Query("""
        SELECT COUNT(p)
        FROM GuidePurchase p
        JOIN Guide g ON g.id = p.guideId
        WHERE p.buyerId = :buyerId
          AND g.creatorId = :creatorId
          AND p.status = :status
        """)
    long countByBuyerIdAndCreatorIdAndStatus(UUID buyerId, UUID creatorId, GuidePurchaseStatus status);

    Optional<GuidePurchase> findByProviderSessionId(String providerSessionId);

    long countByGuideIdAndStatus(UUID guideId, GuidePurchaseStatus status);

    long countByGuideIdAndStatusAndCreatedAtAfter(UUID guideId, GuidePurchaseStatus status, Instant createdAt);

    /** Batch per-guide purchase counts so list mappers avoid one query per guide (BOR-59). */
    interface GuideCount {
        UUID getGuideId();
        long getTotal();
    }

    @org.springframework.data.jpa.repository.Query("""
        SELECT p.guideId AS guideId, COUNT(p) AS total
        FROM GuidePurchase p
        WHERE p.guideId IN :guideIds
          AND p.status = :status
          AND p.createdAt > :since
        GROUP BY p.guideId
        """)
    List<GuideCount> countByGuideIdsAndStatusAndCreatedAtAfter(
            java.util.Collection<UUID> guideIds, GuidePurchaseStatus status, Instant since);
}
