package com.brooks.purchase.api;

import com.brooks.common.dto.PageResponse;
import com.brooks.purchase.dto.CheckoutRequest;
import com.brooks.purchase.dto.CheckoutResponse;
import com.brooks.purchase.dto.PurchaseResponse;
import com.brooks.purchase.service.PurchaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;

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
        return ResponseEntity.ok(purchaseService.getMyPurchases(subject(authentication), page, size));
    }

    @GetMapping(value = "/purchases/{guideId}/content", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPurchasedGuideContent(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        String snapshot = purchaseService.getPurchasedGuideSnapshot(subject(authentication), guideId);
        return ResponseEntity.ok(snapshot);
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
