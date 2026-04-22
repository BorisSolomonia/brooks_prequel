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
import com.brooks.purchase.domain.PurchaseStatus;
import com.brooks.purchase.dto.CheckoutRequest;
import com.brooks.purchase.dto.CheckoutResponse;
import com.brooks.purchase.dto.PurchaseResponse;
import com.brooks.purchase.repository.CreatorEarningRepository;
import com.brooks.purchase.repository.PurchaseRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final GuideRepository guideRepository;
    private final GuideVersionRepository versionRepository;
    private final UserProfileRepository profileRepository;
    private final UserService userService;
    private final UniPayService uniPayService;
    private final CommissionRateResolver commissionRateResolver;
    private final CreatorEarningRepository creatorEarningRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public CheckoutResponse createCheckout(String auth0Subject, CheckoutRequest request) {
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

        // Resolve effective price (sale if active)
        int effectivePrice = guide.getPriceCents();
        if (guide.getSalePriceCents() != null && guide.getSalePriceCents() > 0) {
            boolean saleActive = guide.getSaleEndsAt() == null || guide.getSaleEndsAt().isAfter(Instant.now());
            if (saleActive) {
                effectivePrice = guide.getSalePriceCents();
            }
        }

        // Resolve commission rate for this creator and compute platform fee
        String creatorRegion = profileRepository.findByUserId(guide.getCreatorId())
                .map(p -> p.getRegion())
                .orElse(null);
        CommissionRateResolver.Resolution resolution = commissionRateResolver.resolve(guide.getCreatorId(), creatorRegion);
        int platformFee = (int) Math.ceil((long) effectivePrice * resolution.rateBps() / 10000.0);

        Map<String, String> metadata = new HashMap<>();
        metadata.put("guide_id", guide.getId().toString());
        metadata.put("buyer_id", buyer.getId().toString());
        metadata.put("version_number", String.valueOf(guide.getVersionNumber()));

        try {
            UniPayService.OrderResult order = uniPayService.createOrder(
                    guide.getId().toString(),
                    guide.getTitle(),
                    effectivePrice,
                    guide.getCurrency(),
                    buyer.getEmail(),
                    metadata
            );

            Purchase purchase = new Purchase();
            purchase.setBuyerId(buyer.getId());
            purchase.setGuideId(guide.getId());
            purchase.setGuideVersionNumber(guide.getVersionNumber());
            purchase.setPriceCentsPaid(effectivePrice);
            purchase.setCurrency(guide.getCurrency());
            purchase.setPlatformFeeCents(platformFee);
            purchase.setCommissionRateBps(resolution.rateBps());
            purchase.setUnipayOrderId(order.orderId());
            purchase.setStatus(PurchaseStatus.PENDING);
            purchaseRepository.save(purchase);

            return new CheckoutResponse(order.checkoutUrl(), order.orderId());
        } catch (Exception e) {
            log.error("Failed to create UniPay checkout order", e);
            throw new BusinessException("Failed to initiate checkout");
        }
    }

    @Transactional
    public void handleCheckoutCompleted(String orderId, String transactionId) {
        Purchase purchase = purchaseRepository.findByUnipayOrderId(orderId)
                .orElse(null);

        if (purchase == null) {
            log.warn("No purchase found for UniPay order: {}", orderId);
            return;
        }

        // Atomic PENDING -> COMPLETED transition guards against duplicate webhook delivery
        int rowsUpdated = purchaseRepository.markCompletedIfPending(purchase.getId(), Instant.now());
        if (rowsUpdated == 0) {
            // Already completed by a concurrent webhook — stay idempotent
            return;
        }
        purchase.setUnipayTransactionId(transactionId);

        // Only the winning update increments creator stats and records earnings
        Guide guide = guideRepository.findById(purchase.getGuideId()).orElse(null);
        if (guide != null) {
            profileRepository.findByUserId(guide.getCreatorId())
                    .ifPresent(p -> p.setPurchaseCount(p.getPurchaseCount() + 1));

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
                .build();
    }
}
