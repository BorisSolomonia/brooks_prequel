package com.brooks.purchase.service;

import com.brooks.purchase.domain.CommissionPromotion;
import com.brooks.purchase.domain.CommissionRule;
import com.brooks.purchase.domain.PromotionTargetType;
import com.brooks.purchase.repository.CommissionPromotionRepository;
import com.brooks.purchase.repository.CommissionRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.brooks.purchase.domain.CommissionRuleType.*;

@Service
@RequiredArgsConstructor
public class CommissionRateResolver {

    static final int FALLBACK_RATE_BPS = 2000;

    private final CommissionRuleRepository ruleRepository;
    private final CommissionPromotionRepository promotionRepository;

    public record Resolution(int rateBps, String source, UUID ruleId) {}

    @Transactional(readOnly = true)
    public Resolution resolve(UUID creatorId, String creatorRegion) {
        Instant now = Instant.now();

        // 1. Creator-specific active promotion
        List<CommissionPromotion> creatorPromos = promotionRepository.findActiveForCreator(creatorId, now);
        if (!creatorPromos.isEmpty()) {
            CommissionPromotion p = creatorPromos.get(0);
            return new Resolution(p.getRateBps(), "PROMOTION", p.getId());
        }

        // 2. Region active promotion
        if (creatorRegion != null) {
            Optional<CommissionPromotion> regionPromo = promotionRepository
                    .findActiveByTargetType(PromotionTargetType.REGION, now)
                    .stream()
                    .filter(p -> creatorRegion.equalsIgnoreCase(p.getRegion()))
                    .findFirst();
            if (regionPromo.isPresent()) {
                return new Resolution(regionPromo.get().getRateBps(), "PROMOTION", regionPromo.get().getId());
            }
        }

        // 3. ALL-creators active promotion
        List<CommissionPromotion> allPromos = promotionRepository.findActiveByTargetType(PromotionTargetType.ALL, now);
        if (!allPromos.isEmpty()) {
            CommissionPromotion p = allPromos.get(0);
            return new Resolution(p.getRateBps(), "PROMOTION", p.getId());
        }

        // 4. Individual creator rule
        Optional<CommissionRule> creatorRule = ruleRepository.findFirstByRuleTypeAndCreatorIdAndActiveTrue(CREATOR, creatorId);
        if (creatorRule.isPresent()) {
            return new Resolution(creatorRule.get().getRateBps(), "CREATOR", creatorRule.get().getId());
        }

        // 5. Regional rule
        if (creatorRegion != null) {
            Optional<CommissionRule> regionRule = ruleRepository
                    .findFirstByRuleTypeAndRegionIgnoreCaseAndActiveTrue(REGION, creatorRegion);
            if (regionRule.isPresent()) {
                return new Resolution(regionRule.get().getRateBps(), "REGION", regionRule.get().getId());
            }
        }

        // 6. Global rule
        Optional<CommissionRule> globalRule = ruleRepository.findFirstByRuleTypeAndActiveTrue(GLOBAL);
        if (globalRule.isPresent()) {
            return new Resolution(globalRule.get().getRateBps(), "GLOBAL", globalRule.get().getId());
        }

        // 7. Hardcoded fallback (20%)
        return new Resolution(FALLBACK_RATE_BPS, "FALLBACK", null);
    }
}
