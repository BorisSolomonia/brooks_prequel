package com.brooks.purchase.service;

import com.brooks.guide.domain.Guide;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.purchase.domain.CreatorEarning;
import com.brooks.purchase.domain.Purchase;
import com.brooks.purchase.repository.CreatorEarningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Records creator-side accounting after a purchase completes:
 *  - increments the creator's lifetime purchase count on their profile
 *  - writes the immutable {@code creator_earnings} row (idempotent on purchase_id)
 *
 * Idempotent — safe to call twice on duplicate webhook delivery; the unique
 * {@code purchase_id} on creator_earnings + the existsByPurchaseId guard collapse
 * a second call into a no-op for the earnings write.
 *
 * Note: the profile counter increment is NOT idempotent if called twice for the
 * same purchase. Callers must only invoke this method once per
 * PENDING → COMPLETED transition (the atomic UPDATE in PurchaseService is what
 * enforces "once per transition").
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CreatorEarningsRecorder {

    private final UserProfileRepository profileRepository;
    private final CreatorEarningRepository creatorEarningRepository;

    public void recordForCompletedPurchase(Purchase purchase, Guide guide) {
        if (guide == null) {
            // A completed (paid) purchase whose guide row is gone means we cannot attribute the
            // creator's earning — but it must NEVER be a silent skip: the creator is owed money.
            // Log loudly so it surfaces in observability for manual reconciliation instead of
            // vanishing (BOR-81/82 money-path).
            log.error("Creator earnings NOT recorded: purchase {} is COMPLETED but its guide {} is "
                    + "missing. Creator is un-credited — needs manual reconciliation.",
                    purchase.getId(), purchase.getGuideId());
            return;
        }

        profileRepository.incrementPurchaseCount(guide.getCreatorId());

        if (creatorEarningRepository.existsByPurchaseId(purchase.getId())) {
            return;
        }
        CreatorEarning earning = new CreatorEarning();
        earning.setPurchaseId(purchase.getId());
        earning.setCreatorId(guide.getCreatorId());
        earning.setGrossAmountCents(purchase.getPriceCentsPaid());
        earning.setRateBps(purchase.getCommissionRateBps());
        earning.setCommissionCents(purchase.getPlatformFeeCents());
        earning.setNetAmountCents(purchase.getPriceCentsPaid() - purchase.getPlatformFeeCents());
        earning.setRuleSource("STORED");
        creatorEarningRepository.save(earning);
    }

    /** Result of reversing a creator earning when its purchase is refunded. */
    public enum RefundOutcome {
        /** No earning existed for this purchase (e.g. refund before completion). */
        NO_EARNING,
        /** Earning was already reversed/clawed/held — second refund delivery, no-op. */
        ALREADY_RESOLVED,
        /** Full refund, earning was still owed (PENDING) → marked REVERSED, no longer payable. */
        REVERSED,
        /** Full refund, but we had ALREADY paid the creator → marked CLAWBACK_DUE for recovery. */
        CLAWBACK_DUE,
        /** Partial refund on a still-owed earning → held out of auto-payout for manual reconciliation. */
        FLAGGED_REVIEW
    }

    /**
     * Reverses the creator earning for a refunded purchase so a refunded sale is no longer
     * paid out (or is flagged for clawback if it already was). Without this, refunds silently
     * over-pay creators while the buyer's money has been returned.
     *
     * <p>Idempotent for full refunds: once an earning leaves PENDING/PAID it stays put, so a
     * re-delivered BOG refund callback is a no-op ({@link RefundOutcome#ALREADY_RESOLVED}).
     *
     * <p>Partial refunds: the fair gross/commission/net split is a policy decision and the
     * amount math is not safely repeatable across duplicate callbacks, so instead of mutating
     * amounts we move a still-owed (PENDING) earning to {@code REVIEW} — excluding it from the
     * PENDING auto-payout query — and leave already-PAID earnings untouched but flagged via the
     * returned outcome for manual reconciliation.
     *
     * @param purchaseId the refunded purchase
     * @param partial    true for {@code refunded_partially}, false for a full {@code refunded}
     */
    public RefundOutcome reverseForRefund(java.util.UUID purchaseId, boolean partial) {
        CreatorEarning earning = creatorEarningRepository.findByPurchaseId(purchaseId).orElse(null);
        if (earning == null) {
            return RefundOutcome.NO_EARNING;
        }
        String status = earning.getPayoutStatus();
        boolean payable = "PENDING".equals(status);
        boolean paid = "PAID".equals(status);
        if (!payable && !paid) {
            return RefundOutcome.ALREADY_RESOLVED;
        }

        if (partial) {
            if (paid) {
                // Already paid out in full; a partial refund means we should recover a portion.
                // Don't overwrite the PAID record — surface it for manual reconciliation.
                return RefundOutcome.CLAWBACK_DUE;
            }
            // Still owed: hold the remainder out of auto-payout until a human reconciles the split.
            earning.setPayoutStatus("REVIEW");
            creatorEarningRepository.save(earning);
            return RefundOutcome.FLAGGED_REVIEW;
        }

        if (paid) {
            earning.setPayoutStatus("CLAWBACK_DUE");
            creatorEarningRepository.save(earning);
            return RefundOutcome.CLAWBACK_DUE;
        }
        earning.setPayoutStatus("REVERSED");
        creatorEarningRepository.save(earning);
        return RefundOutcome.REVERSED;
    }
}
