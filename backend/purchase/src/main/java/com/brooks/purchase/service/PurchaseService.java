package com.brooks.purchase.service;

import com.brooks.common.dto.PageResponse;
import com.brooks.common.event.PurchaseCompletedEvent;
import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.Guide;
import com.brooks.guide.domain.GuideStatus;
import com.brooks.guide.domain.GuideVersion;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.guide.repository.GuideVersionRepository;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.purchase.domain.CreatorEarning;
import com.brooks.purchase.domain.Purchase;
import com.brooks.purchase.domain.PurchaseAuditEvent;
import com.brooks.purchase.domain.PurchaseStatus;
import com.brooks.purchase.dto.CheckoutRequest;
import com.brooks.purchase.dto.CheckoutResponse;
import com.brooks.purchase.dto.PurchaseResponse;
import com.brooks.purchase.repository.CreatorEarningRepository;
import com.brooks.purchase.repository.PurchaseAuditEventRepository;
import com.brooks.purchase.repository.PurchaseRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final GuideRepository guideRepository;
    private final GuideVersionRepository versionRepository;
    private final UserProfileRepository profileRepository;
    private final UserService userService;
    private final BogIpayClient bogIpayClient;
    private final CommissionRateResolver commissionRateResolver;
    private final CreatorEarningRepository creatorEarningRepository;
    private final PurchaseAuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;

    public PurchaseService(
            PurchaseRepository purchaseRepository,
            GuideRepository guideRepository,
            GuideVersionRepository versionRepository,
            UserProfileRepository profileRepository,
            UserService userService,
            BogIpayClient bogIpayClient,
            CommissionRateResolver commissionRateResolver,
            CreatorEarningRepository creatorEarningRepository,
            PurchaseAuditEventRepository auditEventRepository,
            ObjectMapper objectMapper,
            ApplicationEventPublisher eventPublisher,
            PlatformTransactionManager transactionManager
    ) {
        this.purchaseRepository = purchaseRepository;
        this.guideRepository = guideRepository;
        this.versionRepository = versionRepository;
        this.profileRepository = profileRepository;
        this.userService = userService;
        this.bogIpayClient = bogIpayClient;
        this.commissionRateResolver = commissionRateResolver;
        this.creatorEarningRepository = creatorEarningRepository;
        this.auditEventRepository = auditEventRepository;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
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
        if (!"GEL".equalsIgnoreCase(guide.getCurrency())) {
            throw new BusinessException("This guide is not priced in GEL and cannot be purchased through BOG iPay");
        }

        // Resolve effective price (sale if active). A sale price equal to or above the regular
        // price would mean the customer pays the same or more — refuse to honor that as a "sale".
        int effectivePrice = guide.getPriceCents();
        if (guide.getSalePriceCents() != null && guide.getSalePriceCents() > 0) {
            if (guide.getSalePriceCents() >= guide.getPriceCents()) {
                throw new BusinessException("Sale price must be lower than the regular price");
            }
            boolean saleActive = guide.getSaleEndsAt() == null || guide.getSaleEndsAt().isAfter(Instant.now());
            if (saleActive) {
                effectivePrice = guide.getSalePriceCents();
            }
        }

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
        purchase.setCurrency("GEL");
        purchase.setPlatformFeeCents(pre.platformFee);
        purchase.setCommissionRateBps(pre.commissionRateBps);
        purchase.setBogOrderId(order.orderId());
        purchase.setStatus(PurchaseStatus.PENDING);
        purchase.setTermsAcceptedAt(Instant.now());
        purchaseRepository.save(purchase);

        recordAuditEvent(purchase.getId(), "CHECKOUT_CREATED", String.format(
                "{\"bogOrderId\":\"%s\",\"amountCents\":%d,\"currency\":\"%s\",\"guideId\":\"%s\"}",
                order.orderId(), pre.effectivePrice, "GEL", pre.guideId));

        return new CheckoutResponse(order.redirectUrl(), order.orderId());
    }

    /**
     * Called by the BOG iPay webhook. Defense in depth: the webhook layer first verifies the
     * Callback-Signature (BogCallbackVerifier), then this method re-fetches the order via the
     * Payment Details API to confirm status/amount/currency before marking the purchase
     * COMPLETED. A signed-but-tampered or replayed callback that lies about the order_status
     * will be caught here.
     */
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
        recordAuditEvent(purchase.getId(),
                partial ? "CHECKOUT_REFUNDED_PARTIALLY" : "CHECKOUT_REFUNDED",
                String.format("{\"bogOrderId\":\"%s\",\"refundAmount\":\"%s\"}",
                        bogOrderId, refundAmount == null ? "" : refundAmount));
    }

    @Transactional
    public void handleCheckoutCompleted(String bogOrderId, String ipayPaymentId, String transactionId) {
        Purchase purchase = purchaseRepository.findByBogOrderId(bogOrderId)
                .orElse(null);

        if (purchase == null) {
            log.warn("No purchase found for BOG iPay order: {}", bogOrderId);
            return;
        }

        // Already completed by a previous webhook — stay idempotent without re-fetching.
        if (purchase.getStatus() == PurchaseStatus.COMPLETED) {
            return;
        }

        // Defense in depth: verify the order with BOG before trusting the callback's claim of
        // 'completed'. A signed-but-replayed or tampered payload can claim any state; the
        // Payment Details API is the authoritative source.
        BogIpayClient.PaymentDetails details;
        try {
            details = bogIpayClient.getPaymentDetails(bogOrderId);
        } catch (Exception e) {
            log.error("BOG Payment Details lookup failed for order_id={} — refusing to complete", bogOrderId, e);
            recordAuditEvent(purchase.getId(), "WEBHOOK_VERIFY_FAILED",
                    String.format("{\"bogOrderId\":\"%s\",\"reason\":\"payment_details_lookup_failed\"}", bogOrderId));
            throw new BusinessException("Payment verification failed");
        }
        if (details == null || !"completed".equalsIgnoreCase(details.status())) {
            log.warn("BOG callback completion rejected — Payment Details status={} for order_id={}",
                    details == null ? "null" : details.status(), bogOrderId);
            recordAuditEvent(purchase.getId(), "WEBHOOK_STATUS_MISMATCH", String.format(
                    "{\"bogOrderId\":\"%s\",\"reportedStatus\":\"%s\"}",
                    bogOrderId, details == null ? "null" : details.status()));
            return;
        }
        if (details.totalAmountMinorUnits() == null
                || details.totalAmountMinorUnits().longValue() != purchase.getPriceCentsPaid()) {
            log.warn("BOG callback completion rejected — amount mismatch for order_id={} expected={} actual={}",
                    bogOrderId, purchase.getPriceCentsPaid(), details.totalAmountMinorUnits());
            recordAuditEvent(purchase.getId(), "WEBHOOK_AMOUNT_MISMATCH", String.format(
                    "{\"bogOrderId\":\"%s\",\"expectedCents\":%d,\"actualCents\":%s}",
                    bogOrderId, purchase.getPriceCentsPaid(),
                    details.totalAmountMinorUnits() == null ? "null" : details.totalAmountMinorUnits().toString()));
            throw new BusinessException("Payment amount mismatch");
        }
        if (details.currency() == null || !details.currency().equalsIgnoreCase(purchase.getCurrency())) {
            log.warn("BOG callback completion rejected — currency mismatch for order_id={} expected={} actual={}",
                    bogOrderId, purchase.getCurrency(), details.currency());
            recordAuditEvent(purchase.getId(), "WEBHOOK_CURRENCY_MISMATCH", String.format(
                    "{\"bogOrderId\":\"%s\",\"expected\":\"%s\",\"actual\":\"%s\"}",
                    bogOrderId, purchase.getCurrency(), details.currency() == null ? "null" : details.currency()));
            throw new BusinessException("Payment currency mismatch");
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

        recordAuditEvent(purchase.getId(), "CHECKOUT_COMPLETED", String.format(
                "{\"bogOrderId\":\"%s\",\"ipayPaymentId\":\"%s\",\"transactionId\":\"%s\"}",
                bogOrderId, resolvedPaymentId == null ? "" : resolvedPaymentId,
                resolvedTransactionId == null ? "" : resolvedTransactionId));

        // Only the winning update increments creator stats and records earnings
        Guide guide = guideRepository.findById(purchase.getGuideId()).orElse(null);
        if (guide != null) {
            profileRepository.incrementPurchaseCount(guide.getCreatorId());

            if (!creatorEarningRepository.existsByPurchaseId(purchase.getId())) {
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

        eventPublisher.publishEvent(new PurchaseCompletedEvent(
                purchase.getId(),
                purchase.getBuyerId(),
                purchase.getGuideId(),
                purchase.getGuideVersionNumber(),
                purchase.getPriceCentsPaid(),
                purchase.getCurrency()
        ));
    }

    @Transactional(readOnly = true)
    public boolean hasPurchasedGuide(UUID buyerId, UUID guideId) {
        return purchaseRepository.existsByBuyerIdAndGuideIdAndStatus(
                buyerId, guideId, PurchaseStatus.COMPLETED);
    }

    @Transactional(readOnly = true)
    public String getPurchasedGuideSnapshot(String auth0Subject, UUID guideId) {
        User buyer = userService.findByAuth0Subject(auth0Subject);
        Purchase purchase = purchaseRepository.findByBuyerIdAndGuideIdAndStatus(
                        buyer.getId(), guideId, PurchaseStatus.COMPLETED)
                .orElseThrow(() -> new BusinessException("You have not purchased this guide"));

        GuideVersion version = versionRepository.findByGuideIdAndVersionNumber(
                        guideId, purchase.getGuideVersionNumber())
                .orElseThrow(() -> new ResourceNotFoundException("GuideVersion", guideId));

        return version.getSnapshot();
    }

    @Transactional(readOnly = true)
    public PageResponse<PurchaseResponse> getMyPurchases(String auth0Subject, int page, int size) {
        User buyer = userService.findByAuth0Subject(auth0Subject);
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Purchase> purchases = purchaseRepository.findByBuyerIdAndStatus(
                buyer.getId(), PurchaseStatus.COMPLETED, pageRequest);

        List<PurchaseResponse> items = purchases.getContent().stream()
                .map(this::toResponse)
                .toList();

        return new PageResponse<>(items, purchases.getNumber(), purchases.getSize(),
                purchases.getTotalElements(), purchases.getTotalPages(), purchases.isLast());
    }

    private PurchaseResponse toResponse(Purchase purchase) {
        String guideTitle = null;
        String guideCoverImageUrl = null;
        String guideRegion = null;

        // Try to extract metadata from the version snapshot
        GuideVersion version = versionRepository.findByGuideIdAndVersionNumber(
                purchase.getGuideId(), purchase.getGuideVersionNumber()).orElse(null);
        if (version != null) {
            try {
                JsonNode node = objectMapper.readTree(version.getSnapshot());
                guideTitle = node.has("title") ? node.get("title").asText() : null;
                guideCoverImageUrl = node.has("coverImageUrl") && !node.get("coverImageUrl").isNull()
                        ? node.get("coverImageUrl").asText() : null;
                guideRegion = node.has("region") && !node.get("region").isNull()
                        ? node.get("region").asText() : null;
            } catch (Exception e) {
                log.warn("Failed to parse guide version snapshot for purchase {}", purchase.getId());
            }
        }

        return PurchaseResponse.builder()
                .id(purchase.getId())
                .guideId(purchase.getGuideId())
                .guideVersionNumber(purchase.getGuideVersionNumber())
                .priceCentsPaid(purchase.getPriceCentsPaid())
                .currency(purchase.getCurrency())
                .status(purchase.getStatus().name())
                .createdAt(purchase.getCreatedAt())
                .completedAt(purchase.getCompletedAt())
                .guideTitle(guideTitle)
                .guideCoverImageUrl(guideCoverImageUrl)
                .guideRegion(guideRegion)
                .bogOrderId(purchase.getBogOrderId())
                .build();
    }

    private void recordAuditEvent(UUID purchaseId, String eventType, String payload) {
        try {
            String snippet = payload == null ? null : payload.substring(0, Math.min(1000, payload.length()));
            auditEventRepository.save(new PurchaseAuditEvent(purchaseId, eventType, snippet));
        } catch (Exception e) {
            log.warn("Failed to record purchase audit event purchase_id={} event_type={}", purchaseId, eventType, e);
        }
    }

    @Transactional(readOnly = true)
    public PurchaseResponse getMyPurchaseByBogOrderId(String auth0Subject, String bogOrderId) {
        User buyer = userService.findByAuth0Subject(auth0Subject);
        Purchase purchase = purchaseRepository.findByBogOrderId(bogOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", bogOrderId));
        if (!purchase.getBuyerId().equals(buyer.getId())) {
            throw new BusinessException("Purchase does not belong to this buyer");
        }
        return toResponse(purchase);
    }
}
