package com.brooks.purchase.repository;

import com.brooks.purchase.domain.CreatorEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CreatorEarningRepository extends JpaRepository<CreatorEarning, UUID> {

    Optional<CreatorEarning> findByPurchaseId(UUID purchaseId);

    boolean existsByPurchaseId(UUID purchaseId);

    List<CreatorEarning> findAllByCreatorId(UUID creatorId);

    List<CreatorEarning> findAllByCreatorIdAndPayoutStatus(UUID creatorId, String payoutStatus);

    @Query("""
            SELECT e.creatorId, SUM(e.grossAmountCents), SUM(e.commissionCents), SUM(e.netAmountCents)
            FROM CreatorEarning e
            WHERE e.payoutStatus = :status
            GROUP BY e.creatorId
            """)
    List<Object[]> findEarningsSummaryGroupedByCreator(@Param("status") String status);
}
