package com.brooks.guide.repository;

import com.brooks.guide.domain.GuideTripItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuideTripItemRepository extends JpaRepository<GuideTripItem, UUID> {

    List<GuideTripItem> findByPurchaseIdOrderByDayNumberAscBlockPositionAscPlacePositionAsc(UUID purchaseId);

    Optional<GuideTripItem> findByPurchaseIdAndPlaceId(UUID purchaseId, UUID placeId);
}
