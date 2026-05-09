package com.brooks.purchase.service;

import com.brooks.guide.domain.Guide;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.purchase.domain.CreatorEarning;
import com.brooks.purchase.domain.Purchase;
import com.brooks.purchase.repository.CreatorEarningRepository;
import lombok.RequiredArgsConstructor;
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
public class CreatorEarningsRecorder {

    private final UserProfileRepository profileRepository;
    private final CreatorEarningRepository creatorEarningRepository;

    public void recordForCompletedPurchase(Purchase purchase, Guide guide) {
        if (guide == null) return;

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
}
