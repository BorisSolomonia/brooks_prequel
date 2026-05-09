package com.brooks.purchase.service;

import com.brooks.common.event.PurchaseCompletedEvent;
import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.common.util.BusinessConstants;
import com.brooks.guide.domain.Guide;
import com.brooks.guide.domain.GuideStatus;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.profile.repository.UserProfileRepository;
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

    public PurchaseService(
            PurchaseRepository purchaseRepository,
            GuideRepository guideRepository,
            UserProfileRepository profileRepository,
            UserService userService,
            BogIpayClient bogIpayClient,
            CommissionRateResolver commissionRateResolver,
            ApplicationEventPublisher eventPublisher,
            PlatformTransactionManager transactionManager,
            PurchaseAuditWriter auditWriter,
            CreatorEarningsRecorder earningsRecorder
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
