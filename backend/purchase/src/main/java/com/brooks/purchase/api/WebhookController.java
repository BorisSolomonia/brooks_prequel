package com.brooks.purchase.api;

import com.brooks.purchase.service.PurchaseService;
import com.brooks.purchase.service.UniPayService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final UniPayService uniPayService;
    private final PurchaseService purchaseService;
    private final ObjectMapper objectMapper;

    @PostMapping("/unipay")
    public ResponseEntity<String> handleUniPayWebhook(
            @RequestBody String payload,
            @RequestHeader("X-UniPay-Signature") String signature) {

        if (!uniPayService.verifyWebhookSignature(payload, signature)) {
            log.warn("UniPay webhook signature verification failed");
            return ResponseEntity.badRequest().body("Invalid signature");
        }

        try {
            JsonNode json = objectMapper.readTree(payload);
            String status = json.get("status").asText();

            if ("COMPLETED".equalsIgnoreCase(status) || "SUCCESS".equalsIgnoreCase(status)) {
                String orderId = json.get("order_id").asText();
                String transactionId = json.has("transaction_id")
                        ? json.get("transaction_id").asText() : null;
                purchaseService.handleCheckoutCompleted(orderId, transactionId);
            }
        } catch (Exception e) {
            log.error("Failed to process UniPay webhook", e);
            return ResponseEntity.internalServerError().body("Processing failed");
        }

        return ResponseEntity.ok("OK");
    }
}
