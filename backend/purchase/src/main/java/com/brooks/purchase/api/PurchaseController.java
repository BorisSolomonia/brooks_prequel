package com.brooks.purchase.api;

import com.brooks.common.dto.PageResponse;
import com.brooks.common.util.Pagination;
import com.brooks.purchase.dto.CheckoutRequest;
import com.brooks.purchase.dto.CheckoutResponse;
import com.brooks.purchase.dto.PurchaseResponse;
import com.brooks.purchase.service.PurchaseQueryService;
import com.brooks.purchase.service.PurchaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.brooks.auth.util.AuthPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final PurchaseQueryService purchaseQueryService;

    @PostMapping("/purchases/checkout")
    public ResponseEntity<CheckoutResponse> createCheckout(
            Authentication authentication,
            @Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.ok(purchaseService.createCheckout(subject(authentication), request));
    }

    @GetMapping("/me/purchases")
    public ResponseEntity<PageResponse<PurchaseResponse>> getMyPurchases(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(purchaseQueryService.getMyPurchases(
                subject(authentication), Pagination.clampPage(page), Pagination.clampSize(size)));
    }

    @GetMapping("/me/purchases/by-bog-order/{bogOrderId}")
    public ResponseEntity<PurchaseResponse> getMyPurchaseByBogOrderId(
            Authentication authentication,
            @PathVariable(name = "bogOrderId") String bogOrderId) {
        return ResponseEntity.ok(purchaseQueryService.getMyPurchaseByBogOrderId(subject(authentication), bogOrderId));
    }

    // The BOG redirect carries our shop_order_id (external_order_id), not BOG's order id, so the
    // post-payment return page resolves the purchase through this endpoint.
    @GetMapping("/me/purchases/by-shop-order/{shopOrderId}")
    public ResponseEntity<PurchaseResponse> getMyPurchaseByShopOrderId(
            Authentication authentication,
            @PathVariable(name = "shopOrderId") String shopOrderId) {
        return ResponseEntity.ok(purchaseQueryService.getMyPurchaseByExternalOrderId(subject(authentication), shopOrderId));
    }

    @GetMapping(value = "/purchases/{guideId}/content", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPurchasedGuideContent(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        String snapshot = purchaseQueryService.getPurchasedGuideSnapshot(subject(authentication), guideId);
        return ResponseEntity.ok(snapshot);
    }

    private String subject(Authentication authentication) {
        return AuthPrincipal.subject(authentication);
    }
}
