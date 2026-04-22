package com.brooks.purchase.repository;

import com.brooks.purchase.domain.CreatorEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CreatorEarningRepository extends JpaRepository<CreatorEarning, UUID> {

    Optional<CreatorEarning> findByPurchaseId(UUID purchaseId);

    boolean existsByPurchaseId(UUID purchaseId);

    List<CreatorEarning> findAllByCreatorId(UUID creatorId);

    @Query("""
            SELECT e.creatorId, SUM(e.grossAmountCents), SUM(e.commissionCents), SUM(e.netAmountCents)
            FROM CreatorEarning e
            GROUP BY e.creatorId
            """)
    List<Object[]> findEarningsSummaryGroupedByCreator();
}
