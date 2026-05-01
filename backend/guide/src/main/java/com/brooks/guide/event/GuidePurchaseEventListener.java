package com.brooks.guide.event;

import com.brooks.common.event.PurchaseCompletedEvent;
import com.brooks.guide.service.GuidePurchaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class GuidePurchaseEventListener {

    private final GuidePurchaseService guidePurchaseService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPurchaseCompleted(PurchaseCompletedEvent event) {
        try {
            guidePurchaseService.materializeTripForPurchase(
                    event.buyerId(),
                    event.guideId(),
                    event.guideVersionNumber(),
                    event.amountCents(),
                    event.currency(),
                    "bog_ipay"
            );
        } catch (Exception e) {
            log.error("Failed to materialize trip for purchase {}", event.purchaseId(), e);
        }
    }
}
