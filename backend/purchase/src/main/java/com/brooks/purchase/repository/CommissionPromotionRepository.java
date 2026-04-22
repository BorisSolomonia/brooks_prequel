package com.brooks.purchase.repository;

import com.brooks.purchase.domain.CommissionPromotion;
import com.brooks.purchase.domain.PromotionTargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CommissionPromotionRepository extends JpaRepository<CommissionPromotion, UUID> {

    @Query("""
            SELECT p FROM CommissionPromotion p
            WHERE p.active = true
              AND p.targetType = :targetType
              AND p.startsAt <= :now
              AND p.endsAt > :now
            ORDER BY p.startsAt DESC
            """)
    List<CommissionPromotion> findActiveByTargetType(
            @Param("targetType") PromotionTargetType targetType,
            @Param("now") Instant now
    );

    @Query("""
            SELECT p FROM CommissionPromotion p
            WHERE p.active = true
              AND p.startsAt <= :now
              AND p.endsAt > :now
              AND :creatorId MEMBER OF p.creatorIds
            ORDER BY p.startsAt DESC
            """)
    List<CommissionPromotion> findActiveForCreator(
            @Param("creatorId") UUID creatorId,
            @Param("now") Instant now
    );

    List<CommissionPromotion> findAllByOrderByCreatedAtDesc();
}
