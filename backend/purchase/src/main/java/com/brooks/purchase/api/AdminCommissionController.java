package com.brooks.purchase.api;

import com.brooks.auth.service.AuthService;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.purchase.domain.CommissionPromotion;
import com.brooks.purchase.domain.CommissionRule;
import com.brooks.purchase.domain.CommissionRuleType;
import com.brooks.purchase.domain.PromotionTargetType;
import com.brooks.purchase.dto.BulkCommissionRequest;
import com.brooks.purchase.dto.CommissionRuleRequest;
import com.brooks.purchase.dto.CommissionRuleResponse;
import com.brooks.purchase.dto.CreatorRateResponse;
import com.brooks.purchase.dto.EarningsSummaryResponse;
import com.brooks.purchase.dto.PromotionRequest;
import com.brooks.purchase.dto.PromotionResponse;
import com.brooks.purchase.repository.CommissionPromotionRepository;
import com.brooks.purchase.repository.CommissionRuleRepository;
import com.brooks.purchase.repository.CreatorEarningRepository;
import com.brooks.purchase.service.CommissionRateResolver;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/commission")
@RequiredArgsConstructor
public class AdminCommissionController {

    private final CommissionRuleRepository ruleRepository;
    private final CommissionPromotionRepository promotionRepository;
    private final CreatorEarningRepository earningRepository;
    private final CommissionRateResolver resolver;
    private final UserProfileRepository profileRepository;
    private final UserService userService;
    private final AuthService authService;

    // ── Rules ────────────────────────────────────────────────────────────────

    @GetMapping("/rules")
    public List<CommissionRuleResponse> listRules() {
        return ruleRepository.findAllByActiveTrue().stream()
                .map(CommissionRuleResponse::from)
                .toList();
    }

    @PostMapping("/rules")
    public CommissionRuleResponse createRule(
            @RequestBody CommissionRuleRequest req,
            Authentication auth
    ) {
        User admin = userService.findByAuth0Subject(authService.extractSubject(auth));

        deactivateConflictingRule(req.ruleType(), req.creatorId(), req.region());

        CommissionRule rule = new CommissionRule();
        rule.setRuleType(req.ruleType());
        rule.setRegion(req.region());
        rule.setCreatorId(req.creatorId());
        rule.setRateBps(req.rateBps());
        rule.setNotes(req.notes());
        rule.setCreatedBy(admin.getId());
        return CommissionRuleResponse.from(ruleRepository.save(rule));
    }

    @PutMapping("/rules/{id}")
    public CommissionRuleResponse updateRule(
            @PathVariable UUID id,
            @RequestBody CommissionRuleRequest req
    ) {
        CommissionRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CommissionRule", id));
        rule.setRateBps(req.rateBps());
        rule.setNotes(req.notes());
        rule.setUpdatedAt(Instant.now());
        return CommissionRuleResponse.from(ruleRepository.save(rule));
    }

    @DeleteMapping("/rules/{id}")
    public ResponseEntity<Void> deactivateRule(@PathVariable UUID id) {
        ruleRepository.findById(id).ifPresent(rule -> {
            rule.setActive(false);
            rule.setUpdatedAt(Instant.now());
            ruleRepository.save(rule);
        });
        return ResponseEntity.noContent().build();
    }

    // ── Promotions ───────────────────────────────────────────────────────────

    @GetMapping("/promotions")
    public List<PromotionResponse> listPromotions() {
        return promotionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(PromotionResponse::from)
                .toList();
    }

    @PostMapping("/promotions")
    public PromotionResponse createPromotion(
            @RequestBody PromotionRequest req,
            Authentication auth
    ) {
        User admin = userService.findByAuth0Subject(authService.extractSubject(auth));

        CommissionPromotion promo = new CommissionPromotion();
        promo.setName(req.name());
        promo.setDescription(req.description());
        promo.setRateBps(req.rateBps());
        promo.setTargetType(req.targetType());
        promo.setRegion(req.region());
        promo.setStartsAt(req.startsAt());
        promo.setEndsAt(req.endsAt());
        promo.setCreatedBy(admin.getId());
        if (req.targetType() == PromotionTargetType.CREATOR_LIST && req.creatorIds() != null) {
            promo.getCreatorIds().addAll(req.creatorIds());
        }
        return PromotionResponse.from(promotionRepository.save(promo));
    }

    @PutMapping("/promotions/{id}/deactivate")
    public ResponseEntity<Void> deactivatePromotion(@PathVariable UUID id) {
        promotionRepository.findById(id).ifPresent(promo -> {
            promo.setActive(false);
            promotionRepository.save(promo);
        });
        return ResponseEntity.noContent().build();
    }

    // ── Creators ─────────────────────────────────────────────────────────────

    @GetMapping("/creators")
    public List<CreatorRateResponse> listCreators() {
        List<UserProfile> profiles = profileRepository.findAll();
        Map<UUID, User> usersById = userService.findAllByIds(
                profiles.stream().map(UserProfile::getUserId).toList());

        List<CreatorRateResponse> result = new ArrayList<>();
        for (UserProfile profile : profiles) {
            User user = usersById.get(profile.getUserId());
            if (user == null) continue;
            CommissionRateResolver.Resolution rate = resolver.resolve(profile.getUserId(), profile.getRegion());
            result.add(new CreatorRateResponse(
                    profile.getUserId(),
                    user.getUsername(),
                    profile.getDisplayName(),
                    profile.getRegion(),
                    profile.isVerified(),
                    profile.getFollowerCount(),
                    rate.rateBps(),
                    rate.source()
            ));
        }
        return result;
    }

    @PostMapping("/creators/bulk-commission")
    public ResponseEntity<Void> bulkSetCommission(
            @RequestBody BulkCommissionRequest req,
            Authentication auth
    ) {
        User admin = userService.findByAuth0Subject(authService.extractSubject(auth));

        for (UUID creatorId : req.creatorIds()) {
            deactivateConflictingRule(CommissionRuleType.CREATOR, creatorId, null);

            CommissionRule rule = new CommissionRule();
            rule.setRuleType(CommissionRuleType.CREATOR);
            rule.setCreatorId(creatorId);
            rule.setRateBps(req.rateBps());
            rule.setNotes(req.notes());
            rule.setCreatedBy(admin.getId());
            ruleRepository.save(rule);
        }
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void deactivateConflictingRule(CommissionRuleType type, UUID creatorId, String region) {
        Optional<CommissionRule> existing = switch (type) {
            case GLOBAL  -> ruleRepository.findFirstByRuleTypeAndActiveTrue(CommissionRuleType.GLOBAL);
            case CREATOR -> creatorId != null
                    ? ruleRepository.findFirstByRuleTypeAndCreatorIdAndActiveTrue(CommissionRuleType.CREATOR, creatorId)
                    : Optional.empty();
            case REGION  -> region != null
                    ? ruleRepository.findFirstByRuleTypeAndRegionIgnoreCaseAndActiveTrue(CommissionRuleType.REGION, region)
                    : Optional.empty();
        };
        existing.ifPresent(rule -> {
            rule.setActive(false);
            rule.setUpdatedAt(Instant.now());
            ruleRepository.save(rule);
        });
    }

    // ── Earnings ─────────────────────────────────────────────────────────────

    @GetMapping("/earnings")
    public EarningsSummaryResponse getEarnings() {
        List<Object[]> rows = earningRepository.findEarningsSummaryGroupedByCreator();

        long totalGross = 0, totalCommission = 0, totalNet = 0;
        List<EarningsSummaryResponse.CreatorEarningsSummary> byCreator = new ArrayList<>();

        for (Object[] row : rows) {
            UUID creatorId = (UUID) row[0];
            long gross = ((Number) row[1]).longValue();
            long commission = ((Number) row[2]).longValue();
            long net = ((Number) row[3]).longValue();
            totalGross += gross;
            totalCommission += commission;
            totalNet += net;
            byCreator.add(new EarningsSummaryResponse.CreatorEarningsSummary(creatorId, gross, commission, net));
        }

        return new EarningsSummaryResponse(totalGross, totalCommission, totalNet, byCreator);
    }
}
