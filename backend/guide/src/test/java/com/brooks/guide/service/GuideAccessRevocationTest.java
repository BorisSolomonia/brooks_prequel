package com.brooks.guide.service;

import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.*;
import com.brooks.guide.repository.*;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GuideAccessRevocationTest {
    @Mock GuideRepository guides;
    @Mock GuideVersionRepository versions;
    @Mock GuidePurchaseRepository trips;
    @Mock GuideTripItemRepository items;
    @Mock UserService users;
    @Mock GuideService guideService;
    @Mock ApplicationEventPublisher events;
    @Mock GuideAccessSourceRepository sources;
    GuidePurchaseService service;
    final UUID buyerId = UUID.randomUUID(), financialId = UUID.randomUUID();
    GuidePurchase trip;
    GuideAccessSource source;

    @BeforeEach void setup() {
        service = new GuidePurchaseService(guides, versions, trips, items, users,
                guideService, new ObjectMapper(), events, sources);
        trip = new GuidePurchase(buyerId, UUID.randomUUID(), UUID.randomUUID(), 1, "bog_ipay", 1000, "GEL");
        trip.setId(UUID.randomUUID());
        trip.setStatus(GuidePurchaseStatus.COMPLETED);
        source = new GuideAccessSource(financialId, trip.getId());
    }

    private void refundSetup() {
        when(sources.findById(financialId)).thenReturn(Optional.of(source));
        when(trips.findByIdAndBuyerId(trip.getId(), buyerId)).thenReturn(Optional.of(trip));
    }

    @Test void fullRefundRevokesLastFinancialSourceAndReplayIsSafe() {
        refundSetup();
        service.revokeFinancialAccess(financialId, buyerId);
        Instant revoked = source.getRevokedAt();
        service.revokeFinancialAccess(financialId, buyerId);
        assertEquals(GuidePurchaseStatus.CANCELED, trip.getStatus());
        assertNotNull(revoked);
        assertEquals(revoked, source.getRevokedAt());
        verify(sources, times(1)).saveAndFlush(source);
    }

    @Test void anotherActivePaymentPreservesAccess() {
        refundSetup();
        when(sources.existsByGuidePurchaseIdAndRevokedAtIsNull(trip.getId())).thenReturn(true);
        service.revokeFinancialAccess(financialId, buyerId);
        assertEquals(GuidePurchaseStatus.COMPLETED, trip.getStatus());
    }

    @Test void independentGiftPreservesAccess() {
        refundSetup();
        trip.setProvider("gift");
        service.revokeFinancialAccess(financialId, buyerId);
        assertEquals(GuidePurchaseStatus.COMPLETED, trip.getStatus());
        verify(sources, never()).existsByGuidePurchaseIdAndRevokedAtIsNull(any());
    }

    @Test void revokedSourceCannotMaterializeAgain() {
        source.setRevokedAt(Instant.now());
        when(sources.findById(financialId)).thenReturn(Optional.of(source));
        service.materializeTripForPurchase(financialId, buyerId, trip.getGuideId(), 1, 1000, "GEL", "bog_ipay");
        verifyNoInteractions(versions, trips);
    }

    @Test void repurchaseReusesCanceledTripAndPreservesItsItems() {
        trip.setStatus(GuidePurchaseStatus.CANCELED);
        trip.setRemovedAt(Instant.now());
        trip.setGuideSnapshot("{}");
        trip.getItems().add(new GuideTripItem());
        GuideVersion version = new GuideVersion();
        version.setId(trip.getGuideVersionId());
        when(versions.findByGuideIdAndVersionNumber(trip.getGuideId(), 1)).thenReturn(Optional.of(version));
        when(trips.findByBuyerIdAndGuideVersionId(buyerId, version.getId())).thenReturn(Optional.of(trip));
        service.materializeTripForPurchase(financialId, buyerId, trip.getGuideId(), 1, 1000, "GEL", "bog_ipay");
        assertEquals(GuidePurchaseStatus.COMPLETED, trip.getStatus());
        assertNull(trip.getRemovedAt());
        assertEquals(1, trip.getItems().size());
        ArgumentCaptor<GuideAccessSource> link = ArgumentCaptor.forClass(GuideAccessSource.class);
        verify(sources).save(link.capture());
        assertEquals(financialId, link.getValue().getFinancialPurchaseId());
        assertEquals(trip.getId(), link.getValue().getGuidePurchaseId());
    }

    @Test void canceledTripCannotBeOpenedOrRestored() {
        trip.setStatus(GuidePurchaseStatus.CANCELED);
        User buyer = new User(); buyer.setId(buyerId);
        when(users.findOptionalByAuth0Subject("buyer")).thenReturn(Optional.of(buyer));
        when(trips.findByIdAndBuyerId(trip.getId(), buyerId)).thenReturn(Optional.of(trip));
        assertThrows(ResourceNotFoundException.class, () -> service.getTrip("buyer", "", trip.getId()));
        assertThrows(ResourceNotFoundException.class, () -> service.restoreTrip("buyer", "", trip.getId()));
        assertThrows(ResourceNotFoundException.class, () -> service.prepareCalendarExport("buyer", "", trip.getId(), Set.of()));
        assertThrows(ResourceNotFoundException.class, () -> service.toggleVisited("buyer", "", trip.getId(), UUID.randomUUID()));
        assertThrows(ResourceNotFoundException.class, () -> service.updateTripSetup("buyer", "", trip.getId(), null));
    }
}
