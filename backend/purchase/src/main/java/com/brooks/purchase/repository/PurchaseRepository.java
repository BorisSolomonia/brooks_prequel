package com.brooks.purchase.repository;

import com.brooks.purchase.domain.Purchase;
import com.brooks.purchase.domain.PurchaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, UUID> {

    Optional<Purchase> findByUnipayOrderId(String unipayOrderId);

    boolean existsByBuyerIdAndGuideIdAndStatus(UUID buyerId, UUID guideId, PurchaseStatus status);

    Optional<Purchase> findByBuyerIdAndGuideIdAndStatus(UUID buyerId, UUID guideId, PurchaseStatus status);

    Page<Purchase> findByBuyerIdAndStatus(UUID buyerId, PurchaseStatus status, Pageable pageable);

    List<Purchase> findByBuyerIdAndStatusOrderByCompletedAtDescCreatedAtDesc(UUID buyerId, PurchaseStatus status);

    @Modifying
    @Query("UPDATE Purchase p SET p.status = com.brooks.purchase.domain.PurchaseStatus.COMPLETED, " +
           "p.completedAt = :completedAt " +
           "WHERE p.id = :id AND p.status = com.brooks.purchase.domain.PurchaseStatus.PENDING")
    int markCompletedIfPending(@Param("id") UUID id, @Param("completedAt") Instant completedAt);
}
