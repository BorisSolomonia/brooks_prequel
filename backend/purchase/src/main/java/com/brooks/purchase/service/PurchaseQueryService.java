package com.brooks.purchase.service;

import com.brooks.common.dto.PageResponse;
import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.GuideVersion;
import com.brooks.guide.repository.GuideVersionRepository;
import com.brooks.purchase.domain.Purchase;
import com.brooks.purchase.domain.PurchaseStatus;
import com.brooks.purchase.dto.PurchaseResponse;
import com.brooks.purchase.repository.PurchaseRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Read-side of the purchase aggregate. Split from {@link PurchaseService} so the
 * write-side can stay focused on checkout + webhook orchestration.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseQueryService {

    private final PurchaseRepository purchaseRepository;
    private final GuideVersionRepository versionRepository;
    private final UserService userService;
    private final ObjectMapper objectMapper;

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

    /**
     * Locates a purchase by the merchant-side external_order_id (shop_order_id) carried in the BOG
     * post-payment redirect URL. This is what the success/fail return page must use — bog_order_id
     * is BOG's id and isn't present in that redirect.
     */
    @Transactional(readOnly = true)
    public PurchaseResponse getMyPurchaseByExternalOrderId(String auth0Subject, String externalOrderId) {
        User buyer = userService.findByAuth0Subject(auth0Subject);
        Purchase purchase = purchaseRepository.findByExternalOrderId(externalOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase", externalOrderId));
        if (!purchase.getBuyerId().equals(buyer.getId())) {
            throw new BusinessException("Purchase does not belong to this buyer");
        }
        return toResponse(purchase);
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

    private PurchaseResponse toResponse(Purchase purchase) {
        // Display fields are denormalised onto purchases (V40), so we don't need to fetch
        // and parse the guide_versions JSON snapshot for the list view. Falls back to
        // re-parsing the snapshot only if the denormalised columns are NULL (legacy rows
        // backfilled from `guides` may diverge from the actual purchased version).
        String guideTitle = purchase.getGuideTitleAtPurchase();
        String guideCoverImageUrl = purchase.getCoverImageUrlAtPurchase();
        String guideRegion = purchase.getRegionAtPurchase();

        if (guideTitle == null) {
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
}
