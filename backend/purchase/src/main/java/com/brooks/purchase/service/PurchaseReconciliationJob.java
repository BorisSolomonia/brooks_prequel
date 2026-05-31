package com.brooks.purchase.service;

import com.brooks.purchase.domain.Purchase;
import com.brooks.purchase.domain.PurchaseStatus;
import com.brooks.purchase.repository.PurchaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Safety-net for the purchase→unlock flow: if a BOG webhook is lost or misreported, a paid order
 * would otherwise sit PENDING forever (charged, locked). This sweep periodically re-verifies PENDING
 * orders against BOG's Payment Details API and fulfills the genuinely-paid ones idempotently — the
 * same verified path used by the webhook and verify-on-return. It never unlocks an order BOG does not
 * confirm as paid.
 *
 * Window: older than {@code MIN_AGE} (give the webhook a chance first) and younger than {@code MAX_AGE}
 * (stop chasing dead/abandoned orders). Requires @EnableScheduling (set in AppConfig).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PurchaseReconciliationJob {

    private static final long MIN_AGE_MINUTES = 2;
    private static final long MAX_AGE_HOURS = 24;

    private final PurchaseRepository purchaseRepository;
    private final PurchaseService purchaseService;

    @Scheduled(fixedDelayString = "${bog-ipay.reconcile-interval-ms:300000}", initialDelay = 120_000)
    public void reconcilePendingPurchases() {
        Instant now = Instant.now();
        List<Purchase> pending = purchaseRepository.findTop200ByStatusAndCreatedAtBetweenOrderByCreatedAtAsc(
                PurchaseStatus.PENDING,
                now.minus(MAX_AGE_HOURS, ChronoUnit.HOURS),
                now.minus(MIN_AGE_MINUTES, ChronoUnit.MINUTES));
        if (pending.isEmpty()) {
            return;
        }
        log.info("Purchase reconcile: re-verifying {} pending order(s) against BOG", pending.size());
        for (Purchase p : pending) {
            try {
                purchaseService.reconcilePurchase(p);
            } catch (Exception e) {
                log.error("Purchase reconcile failed for purchase {}", p.getId(), e);
            }
        }
    }
}
