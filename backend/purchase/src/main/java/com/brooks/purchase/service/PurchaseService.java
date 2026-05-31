package com.brooks.purchase.service;

import com.brooks.common.event.PurchaseCompletedEvent;
import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.common.util.BusinessConstants;
import com.brooks.guide.domain.Guide;
import com.brooks.guide.domain.GuidePricingMode;
import com.brooks.guide.domain.GuideStatus;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.social.repository.FollowRepository;
import com.brooks.purchase.domain.Purchase;
import com.brooks.purchase.domain.PurchaseStatus;
import com.brooks.purchase.dto.CheckoutRequest;
import com.brooks.purchase.dto.CheckoutResponse;
import com.brooks.purchase.repository.PurchaseRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.UUID;

import static com.brooks.purchase.service.PurchaseAuditWriter.payload;

/**
 * Write-side of the purchase aggregate: create checkouts and process BOG iPay
 * webhook callbacks. Read-side queries live in {@link PurchaseQueryService}.
 *
 * Cross-cutting concerns are delegated to focused collaborators:
 *  - audit logging  → {@link PurchaseAuditWriter}
 *  - earnings + creator counter → {@link CreatorEarningsRecorder}
 *  - trip materialisation → {@code GuidePurchaseEventListener} (via PurchaseCompletedEvent)
 */
@Service
@Slf4j
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final GuideRepository guideRepository;
    private final UserProfileRepository profileRepository;
    private final UserService userService;
    private final BogIpayClient bogIpayClient;
    private final CommissionRateResolver commissionRateResolver;
    private final ApplicationEventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;
    private final PurchaseAuditWriter auditWriter;
    private final CreatorEarningsRecorder earningsRecorder;
    private final FollowRepository followRepository;
    // Used to synchronously self-heal the access "trip" during verify-on-return, so a paid
    // purchase deterministically unlocks even if the AFTER_COMMIT event listener was lost/failed.
    private final com.brooks.guide.service.GuidePurchaseService guidePurchaseService;

    public PurchaseService(
            PurchaseRepository purchaseRepository,
            GuideRepository guideRepository,
            UserProfileRepository profileRepository,
            UserService userService,
            BogIpayClient bogIpayClient,
            CommissionRateResolver commissionRateResolver,
            FollowRepository followRepository,
            ApplicationEventPublisher eventPublisher,
            PlatformTransactionManager transactionManager,
            PurchaseAuditWriter auditWriter,
            CreatorEarningsRecorder earningsRecorder,
            com.brooks.guide.service.GuidePurchaseService guidePurchaseService
    ) {
        this.purchaseRepository = purchaseRepository;
        this.guideRepository = guideRepository;
        this.profileRepository = profileRepository;
        this.userService = userService;
        this.bogIpayClient = bogIpayClient;
        this.commissionRateResolver = commissionRateResolver;
        this.eventPublisher = eventPublisher;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.auditWriter = auditWriter;
        this.earningsRecorder = earningsRecorder;
        this.followRepository = followRepository;
        this.guidePurchaseService = guidePurchaseService;
    }

    /**
     * Verify-on-return / reconcile entry point. Called when the buyer lands on the success page (and
     * by the reconciliation sweep). Drives unlock from the AUTHORITATIVE BOG payment status rather
     * than trusting the (possibly lost or misreported) webhook:
     *   - If already COMPLETED → just make sure the access trip exists (self-heal) and return.
     *   - Else → run the same verified, idempotent completion path used by the webhook
     *     ({@link #handleCheckoutCompleted}), which re-fetches BOG Payment Details and only completes
     *     if BOG confirms the order is paid (+ amount/currency match). A charge that BOG does NOT
     *     confirm as paid is left unfulfilled and audited — never unlocked.
     * Safe to call repeatedly (idempotent).
     */
    public void verifyAndFulfill(String auth0Subject, String externalOrderId) {
        User buyer = userService.findByAuth0Subject(auth0Subject);
        Purchase purchase = purchaseRepository.findByExternalOrderId(externalOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", externalOrderId));
        if (!purchase.getBuyerId().equals(buyer.getId())) {
            throw new BusinessException("Purchase does not belong to this buyer");
        }
        reconcilePurchase(purchase);
    }

    /**
     * Re-verify a single purchase against BOG and fulfill if genuinely paid. Idempotent; never
     * throws on a verification mismatch (it's audited inside {@link #handleCheckoutCompleted}).
     * Used by both verify-on-return and the scheduled reconciliation sweep.
     */
    public void reconcilePurchase(Purchase purchase) {
        if (purchase.getStatus() != PurchaseStatus.COMPLETED) {
            if (purchase.getBogOrderId() == null) {
                return; // free checkout or not an iPay order — nothing to verify
            }
            try {
                handleCheckoutCompleted(purchase.getBogOrderId(), null, null);
            } catch (BusinessException e) {
                // amount/currency mismatch already audited; leave PENDING (do NOT unlock)
                log.warn("Reconcile: BOG verification did not confirm payment for order_id={}: {}",
                        purchase.getBogOrderId(), e.getMessage());
                return;
            } catch (Exception e) {
                log.error("Reconcile: failed to verify order_id={}", purchase.getBogOrderId(), e);
                return;
            }
        }
        // Re-read and, if COMPLETED, ensure the access trip exists (deterministic self-heal).
        Purchase fresh = purchaseRepository.findById(purchase.getId()).orElse(purchase);
        if (fresh.getStatus() == PurchaseStatus.COMPLETED) {
            ensureTripMaterialized(fresh);
        }
    }

    /** Idempotently (re)create the access trip for a COMPLETED purchase. */
    private void ensureTripMaterialized(Purchase purchase) {
        try {
            guidePurchaseService.materializeTripForPurchase(
                    purchase.getBuyerId(),
                    purchase.getGuideId(),
                    purchase.getGuideVersionNumber(),
                    purchase.getPriceCentsPaid(),
                    purchase.getCurrency(),
                    "bog_ipay");
        } catch (Exception e) {
            log.error("Failed to ensure trip for completed purchase {}", purchase.getId(), e);
        }
    }

    /**
     * Two-phase checkout creation:
     *   1) Read-only preflight (eligibility, price, fee) — short DB transaction.
     *   2) BOG iPay createOrder HTTP call — NO transaction held while waiting on the network.
     *   3) Short write transaction to persist the Purchase row + audit event.
     * This avoids holding row locks across a (potentially slow) external HTTP call and means a
     * BOG failure leaves no orphan PENDING row in our DB.
     */
    public CheckoutResponse createCheckout(String auth0Subject, CheckoutRequest request) {
        // Free-pricing-mode short circuit (V54). Before doing ANY iPay work,
        // check whether the guide is FREE_PUBLIC or FREE_FOR_FOLLOWERS and
        // the buyer is eligible. Eligible buyers skip iPay entirely and get
        // a COMPLETED purchase row materialised on the spot. The buyer
        // lands on /trips/{purchaseId} with full access.
        CheckoutResponse freeResponse = transactionTemplate.execute(status ->
                tryFreeCheckout(auth0Subject, request));
        if (freeResponse != null) {
            return freeResponse;
        }

        CheckoutPreflight pre = transactionTemplate.execute(status -> preflight(auth0Subject, request));

        BogIpayClient.CreatedOrder order;
        try {
            order = bogIpayClient.createOrder(
                    pre.shopOrderId,
                    pre.effectivePrice,
                    pre.guideTitle,
                    pre.guideId.toString()
            );
        } catch (Exception e) {
            log.error("Failed to create BOG iPay checkout order", e);
            throw new BusinessException("Failed to initiate checkout");
        }

        return transactionTemplate.execute(status -> persistCheckout(pre, order));
    }

    private record CheckoutPreflight(
            UUID buyerId,
            UUID guideId,
            String guideTitle,
            String guideCoverImageUrl,
            String guideRegion,
            int guideVersionNumber,
            int effectivePrice,
            int platformFee,
            int commissionRateBps,
            String shopOrderId
    ) {}

    /**
     * Short-circuit a paid checkout if the guide is in a FREE pricing mode
     * and the buyer is eligible. Returns null when the regular (iPay) flow
     * should run; returns a populated CheckoutResponse pointing directly at
     * the newly materialised trip when free.
     *
     * Eligibility:
     *   FREE_PUBLIC          — any signed-in buyer.
     *   FREE_FOR_FOLLOWERS   — buyer must already follow the creator.
     *                          Non-followers fall through to paid flow
     *                          (which will then complain via the "not in
     *                          GEL" check or proceed if priced in GEL).
     *
     * Side effects when free path runs:
     *   • One Purchase row with status=COMPLETED, priceCentsPaid=0,
     *     bogOrderId=null (it's not an iPay order).
     *   • Audit event "FREE_CHECKOUT_COMPLETED".
     *   • PurchaseCompletedEvent published → existing trip-materialisation
     *     listener creates the trip items just like a paid checkout.
     */
    private CheckoutResponse tryFreeCheckout(String auth0Subject, CheckoutRequest request) {
        User buyer = userService.findByAuth0Subject(auth0Subject);
        Guide guide = guideRepository.findById(request.getGuideId())
                .orElseThrow(() -> new ResourceNotFoundException("Guide", request.getGuideId()));

        if (guide.getStatus() != GuideStatus.PUBLISHED) {
            return null;
        }
        GuidePricingMode mode = guide.getPricingMode();
        if (mode == null || mode == GuidePricingMode.PAID) {
            return null;
        }
        if (guide.getCreatorId().equals(buyer.getId())) {
            // Creator-owns-guide check is enforced in the paid preflight too.
            // Returning null here lets that path emit the standard error.
            return null;
        }
        if (mode == GuidePricingMode.FREE_FOR_FOLLOWERS
                && !followRepository.existsByFollowerIdAndFollowingId(buyer.getId(), guide.getCreatorId())) {
            return null; // not a follower — fall through to paid checkout
        }

        // Already owned? Take them to their existing trip.
        var existing = purchaseRepository.findByBuyerIdAndGuideIdAndStatus(
                buyer.getId(), guide.getId(), PurchaseStatus.COMPLETED);
        if (existing.isPresent()) {
            Purchase p = existing.get();
            return new CheckoutResponse("/trips/" + p.getId(), "free-already-owned-" + p.getId());
        }

        Purchase purchase = new Purchase();
        purchase.setBuyerId(buyer.getId());
        purchase.setGuideId(guide.getId());
        purchase.setGuideVersionNumber(guide.getVersionNumber());
        purchase.setPriceCentsPaid(0);
        purchase.setCurrency(BusinessConstants.CURRENCY_GEL);
        purchase.setPlatformFeeCents(0);
        purchase.setCommissionRateBps(0);
        purchase.setStatus(PurchaseStatus.COMPLETED);
        purchase.setTermsAcceptedAt(Instant.now());
        purchase.setGuideTitleAtPurchase(guide.getTitle());
        purchase.setCoverImageUrlAtPurchase(guide.getCoverImageUrl());
        purchase.setRegionAtPurchase(guide.getRegion());
        purchaseRepository.save(purchase);

        auditWriter.record(purchase.getId(), "FREE_CHECKOUT_COMPLETED", payload(
                "pricingMode", mode.name(),
                "guideId", guide.getId().toString()));

        eventPublisher.publishEvent(new PurchaseCompletedEvent(
                purchase.getId(),
                purchase.getBuyerId(),
                purchase.getGuideId(),
                purchase.getGuideVersionNumber(),
                0,
                BusinessConstants.CURRENCY_GEL
        ));

        return new CheckoutResponse("/trips/" + purchase.getId(), "free-" + purchase.getId());
    }

    private CheckoutPreflight preflight(String auth0Subject, CheckoutRequest request) {
        User buyer = userService.findByAuth0Subject(auth0Subject);
        Guide guide = guideRepository.findById(request.getGuideId())
                .orElseThrow(() -> new ResourceNotFoundException("Guide", request.getGuideId()));

        if (guide.getStatus() != GuideStatus.PUBLISHED) {
            throw new BusinessException("Guide is not available for purchase");
        }
        if (guide.getCreatorId().equals(buyer.getId())) {
            throw new BusinessException("You cannot purchase your own guide");
        }
        if (guide.getPriceCents() == 0) {
            throw new BusinessException("This guide is free and does not require purchase");
        }
        if (purchaseRepository.existsByBuyerIdAndGuideIdAndStatus(
                buyer.getId(), guide.getId(), PurchaseStatus.COMPLETED)) {
            throw new BusinessException("You have already purchased this guide");
        }

        // BOG iPay supports GEL only — verify guide is priced in GEL
        if (!BusinessConstants.CURRENCY_GEL.equalsIgnoreCase(guide.getCurrency())) {
            throw new BusinessException("This guide is not priced in GEL and cannot be purchased through BOG iPay");
        }

        // A sale price equal to or above the regular price would mean the customer pays the
        // same or more — refuse to honor that as a "sale". Charging the effective price
        // (sale-if-active else regular) is delegated to the entity.
        if (guide.getSalePriceCents() != null && guide.getSalePriceCents() > 0
                && guide.getSalePriceCents() >= guide.getPriceCents()) {
            throw new BusinessException("Sale price must be lower than the regular price");
        }
        int effectivePrice = guide.effectivePrice();

        String creatorRegion = profileRepository.findByUserId(guide.getCreatorId())
                .map(p -> p.getRegion())
                .orElse(null);
        CommissionRateResolver.Resolution resolution =
                commissionRateResolver.resolve(guide.getCreatorId(), creatorRegion);
        int platformFee = (int) Math.ceil((long) effectivePrice * resolution.rateBps() / 10000.0);

        return new CheckoutPreflight(
                buyer.getId(),
                guide.getId(),
                guide.getTitle(),
                guide.getCoverImageUrl(),
                guide.getRegion(),
                guide.getVersionNumber(),
                effectivePrice,
                platformFee,
                resolution.rateBps(),
                UUID.randomUUID().toString()
        );
    }

    private CheckoutResponse persistCheckout(CheckoutPreflight pre, BogIpayClient.CreatedOrder order) {
        Purchase purchase = new Purchase();
        purchase.setBuyerId(pre.buyerId);
        purchase.setGuideId(pre.guideId);
        purchase.setGuideVersionNumber(pre.guideVersionNumber);
        purchase.setPriceCentsPaid(pre.effectivePrice);
        purchase.setCurrency(BusinessConstants.CURRENCY_GEL);
        purchase.setPlatformFeeCents(pre.platformFee);
        purchase.setCommissionRateBps(pre.commissionRateBps);
        purchase.setBogOrderId(order.orderId());
        // Store the id carried in the BOG redirect URL so the return page can locate this purchase.
        purchase.setExternalOrderId(pre.shopOrderId);
        purchase.setStatus(PurchaseStatus.PENDING);
        purchase.setTermsAcceptedAt(Instant.now());
        purchase.setGuideTitleAtPurchase(pre.guideTitle);
        purchase.setCoverImageUrlAtPurchase(pre.guideCoverImageUrl);
        purchase.setRegionAtPurchase(pre.guideRegion);
        purchaseRepository.save(purchase);

        auditWriter.record(purchase.getId(), "CHECKOUT_CREATED", payload(
                "bogOrderId", order.orderId(),
                "amountCents", pre.effectivePrice,
                "currency", BusinessConstants.CURRENCY_GEL,
                "guideId", pre.guideId.toString()));

        return new CheckoutResponse(order.redirectUrl(), order.orderId());
    }

    /**
     * BOG reported the payment as rejected/declined. Transition the still-PENDING purchase to the
     * terminal FAILED state so it doesn't linger as PENDING and the return page can show a clear
     * status. Never grants access. Idempotent: only PENDING is moved, so a re-delivered callback
     * (or one arriving after a completion) is a no-op.
     */
    @Transactional
    public void handleCheckoutRejected(String bogOrderId) {
        Purchase purchase = purchaseRepository.findByBogOrderId(bogOrderId).orElse(null);
        if (purchase == null) {
            log.warn("BOG iPay rejected callback for unknown order: {}", bogOrderId);
            return;
        }
        if (purchase.getStatus() == PurchaseStatus.PENDING) {
            purchase.setStatus(PurchaseStatus.FAILED);
            auditWriter.record(purchase.getId(), "CHECKOUT_REJECTED", payload("bogOrderId", bogOrderId));
        }
    }

    @Transactional
    public void handleCheckoutRefunded(String bogOrderId, String refundAmount, boolean partial) {
        Purchase purchase = purchaseRepository.findByBogOrderId(bogOrderId).orElse(null);
        if (purchase == null) {
            log.warn("BOG iPay refund callback for unknown order: {}", bogOrderId);
            return;
        }
        if (!partial) {
            purchase.setStatus(PurchaseStatus.REFUNDED);
        }
        auditWriter.record(purchase.getId(),
                partial ? "CHECKOUT_REFUNDED_PARTIALLY" : "CHECKOUT_REFUNDED",
                payload("bogOrderId", bogOrderId,
                        "refundAmount", refundAmount == null ? "" : refundAmount));

        // Reverse the creator earning so a refunded sale is no longer owed/paid. Without this,
        // a refund returns the buyer's money while the creator's net stays payable (or is paid),
        // and the platform silently eats the loss with no recovery trail.
        CreatorEarningsRecorder.RefundOutcome outcome = earningsRecorder.reverseForRefund(purchase.getId(), partial);
        switch (outcome) {
            case REVERSED -> auditWriter.record(purchase.getId(), "EARNING_REVERSED",
                    payload("bogOrderId", bogOrderId));
            case CLAWBACK_DUE -> auditWriter.record(purchase.getId(), "EARNING_CLAWBACK_DUE",
                    payload("bogOrderId", bogOrderId,
                            "note", "earning already paid out before refund — recover from creator"));
            case FLAGGED_REVIEW -> auditWriter.record(purchase.getId(), "EARNING_PAYOUT_HELD_FOR_REVIEW",
                    payload("bogOrderId", bogOrderId,
                            "note", "partial refund — remaining payout held for manual reconciliation"));
            case NO_EARNING, ALREADY_RESOLVED -> { /* nothing payable to reverse */ }
        }
    }

    /**
     * Called by the BOG iPay webhook. Defense in depth: the webhook layer first verifies the
     * Callback-Signature, then this method re-fetches the order via the Payment Details API
     * to confirm status/amount/currency before marking the purchase COMPLETED. A signed-but-
     * tampered or replayed callback that lies about order_status will be caught here.
     */
    @Transactional
    public void handleCheckoutCompleted(String bogOrderId, String ipayPaymentId, String transactionId) {
        Purchase purchase = purchaseRepository.findByBogOrderId(bogOrderId).orElse(null);

        if (purchase == null) {
            log.warn("No purchase found for BOG iPay order: {}", bogOrderId);
            return;
        }

        // Already completed by a previous webhook — stay idempotent without re-fetching.
        if (purchase.getStatus() == PurchaseStatus.COMPLETED) {
            return;
        }

        BogIpayClient.PaymentDetails details = verifyPaymentDetails(purchase, bogOrderId);
        if (details == null) {
            // Status mismatch — already audited inside verifyPaymentDetails. Stay silent so
            // BOG doesn't retry; we'll reconcile from the buyer's return-from-redirect path.
            return;
        }

        // Prefer authoritative IDs from the receipt over whatever the callback body claimed.
        String resolvedPaymentId = ipayPaymentId != null ? ipayPaymentId : details.authCode();
        String resolvedTransactionId = transactionId != null ? transactionId : details.transactionId();

        // Atomic PENDING -> COMPLETED transition guards against duplicate webhook delivery,
        // and writes payment/transaction IDs in the same UPDATE so the in-memory entity never
        // diverges from the row.
        int rowsUpdated = purchaseRepository.markCompletedIfPending(
                purchase.getId(), Instant.now(), resolvedPaymentId, resolvedTransactionId);
        if (rowsUpdated == 0) {
            // Already completed by a concurrent webhook — stay idempotent
            return;
        }

        auditWriter.record(purchase.getId(), "CHECKOUT_COMPLETED", payload(
                "bogOrderId", bogOrderId,
                "ipayPaymentId", resolvedPaymentId == null ? "" : resolvedPaymentId,
                "transactionId", resolvedTransactionId == null ? "" : resolvedTransactionId));

        // Only the winning update increments creator stats and records earnings
        Guide guide = guideRepository.findById(purchase.getGuideId()).orElse(null);
        earningsRecorder.recordForCompletedPurchase(purchase, guide);

        eventPublisher.publishEvent(new PurchaseCompletedEvent(
                purchase.getId(),
                purchase.getBuyerId(),
                purchase.getGuideId(),
                purchase.getGuideVersionNumber(),
                purchase.getPriceCentsPaid(),
                purchase.getCurrency()
        ));
    }

    /**
     * Re-fetches the Payment Details from BOG and validates status / amount / currency
     * against what we wrote on checkout. Throws on lookup failure so BOG retries; logs
     * an audit event and throws BusinessException on a mismatch.
     */
    private BogIpayClient.PaymentDetails verifyPaymentDetails(Purchase purchase, String bogOrderId) {
        BogIpayClient.PaymentDetails details;
        try {
            details = bogIpayClient.getPaymentDetails(bogOrderId);
        } catch (Exception e) {
            log.error("BOG Payment Details lookup failed for order_id={} — refusing to complete", bogOrderId, e);
            auditWriter.record(purchase.getId(), "WEBHOOK_VERIFY_FAILED",
                    payload("bogOrderId", bogOrderId, "reason", "payment_details_lookup_failed"));
            throw new BusinessException("Payment verification failed");
        }
        if (details == null || !"completed".equalsIgnoreCase(details.status())) {
            log.warn("BOG callback completion rejected — Payment Details status={} for order_id={}",
                    details == null ? "null" : details.status(), bogOrderId);
            auditWriter.record(purchase.getId(), "WEBHOOK_STATUS_MISMATCH",
                    payload("bogOrderId", bogOrderId,
                            "reportedStatus", details == null ? "null" : details.status()));
            // Match the original semantics — return null to signal "no-op, ack 200".
            return null;
        }
        if (details.totalAmountMinorUnits() == null
                || details.totalAmountMinorUnits().longValue() != purchase.getPriceCentsPaid()) {
            log.warn("BOG callback completion rejected — amount mismatch for order_id={} expected={} actual={}",
                    bogOrderId, purchase.getPriceCentsPaid(), details.totalAmountMinorUnits());
            auditWriter.record(purchase.getId(), "WEBHOOK_AMOUNT_MISMATCH",
                    payload("bogOrderId", bogOrderId,
                            "expectedCents", purchase.getPriceCentsPaid(),
                            "actualCents", details.totalAmountMinorUnits() == null
                                    ? "null" : details.totalAmountMinorUnits().toString()));
            throw new BusinessException("Payment amount mismatch");
        }
        if (details.currency() == null || !details.currency().equalsIgnoreCase(purchase.getCurrency())) {
            log.warn("BOG callback completion rejected — currency mismatch for order_id={} expected={} actual={}",
                    bogOrderId, purchase.getCurrency(), details.currency());
            auditWriter.record(purchase.getId(), "WEBHOOK_CURRENCY_MISMATCH",
                    payload("bogOrderId", bogOrderId,
                            "expected", purchase.getCurrency(),
                            "actual", details.currency() == null ? "null" : details.currency()));
            throw new BusinessException("Payment currency mismatch");
        }
        return details;
    }

    @Transactional(readOnly = true)
    public boolean hasPurchasedGuide(UUID buyerId, UUID guideId) {
        return purchaseRepository.existsByBuyerIdAndGuideIdAndStatus(
                buyerId, guideId, PurchaseStatus.COMPLETED);
    }
}
