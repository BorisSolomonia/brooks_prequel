package com.brooks.purchase.service;

import com.brooks.guide.service.GuidePurchaseService;
import com.brooks.purchase.domain.*;
import com.brooks.purchase.repository.PurchaseRepository;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.mockito.Mockito.*;

class PurchaseFulfillmentServiceTest {
    @Test void delayedEventDoesNotGrantRefundedPurchase() {
        var repository = mock(PurchaseRepository.class);
        var guides = mock(GuidePurchaseService.class);
        var purchase = new Purchase(); purchase.setId(UUID.randomUUID()); purchase.setStatus(PurchaseStatus.REFUNDED);
        when(repository.findByIdForUpdate(purchase.getId())).thenReturn(Optional.of(purchase));
        new PurchaseFulfillmentService(repository, guides).fulfill(purchase.getId());
        verifyNoInteractions(guides);
    }

    @Test void completedPurchasePassesItsIdentityToAccessLedger() {
        var repository = mock(PurchaseRepository.class);
        var guides = mock(GuidePurchaseService.class);
        var purchase = new Purchase();
        purchase.setId(UUID.randomUUID()); purchase.setBuyerId(UUID.randomUUID()); purchase.setGuideId(UUID.randomUUID());
        purchase.setStatus(PurchaseStatus.COMPLETED); purchase.setGuideVersionNumber(3); purchase.setPriceCentsPaid(1000);
        when(repository.findByIdForUpdate(purchase.getId())).thenReturn(Optional.of(purchase));
        new PurchaseFulfillmentService(repository, guides).fulfill(purchase.getId());
        verify(guides).materializeTripForPurchase(purchase.getId(), purchase.getBuyerId(), purchase.getGuideId(),
                3, 1000, "GEL", "bog_ipay");
    }
}
