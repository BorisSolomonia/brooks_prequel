package com.brooks.guide.repository;

import com.brooks.guide.domain.TripCalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripCalendarEventRepository extends JpaRepository<TripCalendarEvent, UUID> {

    List<TripCalendarEvent> findByPurchaseIdAndProvider(UUID purchaseId, String provider);

    Optional<TripCalendarEvent> findByTripItemIdAndProvider(UUID tripItemId, String provider);

    void deleteByPurchaseIdAndProvider(UUID purchaseId, String provider);
}
