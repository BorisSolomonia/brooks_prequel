package com.brooks.purchase.service;

import com.brooks.guide.service.GuidePurchaseService;
import com.brooks.purchase.domain.PurchaseStatus;
import com.brooks.purchase.repository.PurchaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseFulfillmentService {
    private final PurchaseRepository purchases;
    private final GuidePurchaseService guides;

    // AFTER_COMMIT delivery needs a fresh transaction. The same financial row lock is
    // used by refunds, so a delayed/retried completion can never resurrect refunded access.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fulfill(UUID purchaseId) {
        purchases.findByIdForUpdate(purchaseId)
                .filter(p -> p.getStatus() == PurchaseStatus.COMPLETED)
                .ifPresent(p -> guides.materializeTripForPurchase(p.getId(), p.getBuyerId(), p.getGuideId(),
                        p.getGuideVersionNumber(), p.getPriceCentsPaid(), p.getCurrency(), "bog_ipay"));
    }
}
