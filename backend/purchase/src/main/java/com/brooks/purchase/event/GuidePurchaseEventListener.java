package com.brooks.purchase.event;

import com.brooks.common.event.PurchaseCompletedEvent;
import com.brooks.purchase.service.PurchaseFulfillmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class GuidePurchaseEventListener {

    private final PurchaseFulfillmentService fulfillmentService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPurchaseCompleted(PurchaseCompletedEvent event) {
        try {
            fulfillmentService.fulfill(event.purchaseId());
        } catch (Exception e) {
            log.error("Failed to materialize trip for purchase {}", event.purchaseId(), e);
        }
    }
}
