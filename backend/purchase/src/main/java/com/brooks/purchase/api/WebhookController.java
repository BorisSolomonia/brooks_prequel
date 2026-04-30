package com.brooks.purchase.api;

import com.brooks.purchase.service.BogIpayClient;
import com.brooks.purchase.service.PurchaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Objects;

/**
 * Receives BOG iPay callbacks. Per BOG docs (https://api.bog.ge/docs/en/ipay/callback):
 * <ul>
 *   <li>POST application/x-www-form-urlencoded</li>
 *   <li>BOG retries every 15s up to 5 times until HTTP 200</li>
 *   <li>NO callback signature is documented — verification must happen by re-fetching
 *       Payment Details API and comparing payment_hash with the value stored at order creation.</li>
 *   <li>Always return 200 once we have either confirmed success or determined the callback
 *       is for a payment we don't recognise; non-200 forces BOG to retry.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final BogIpayClient bogIpayClient;
    private final PurchaseService purchaseService;

    @PostMapping(value = "/bog-ipay", consumes = "application/x-www-form-urlencoded")
    public ResponseEntity<String> handleBogIpayCallback(@RequestParam Map<String, String> form) {
        String orderId = form.get("order_id");
        String callbackPaymentHash = form.get("payment_hash");
        String callbackStatus = form.get("status");

        if (orderId == null || orderId.isBlank()) {
            log.warn("BOG iPay callback missing order_id; payload keys={}", form.keySet());
            // Still 200 — BOG should not retry malformed callbacks indefinitely
            return ResponseEntity.ok("OK");
        }

        try {
            // Server-side verification: re-fetch payment details and verify payment_hash match.
            // This is our defense against forged callbacks (BOG does not sign them).
            BogIpayClient.PaymentDetails details = bogIpayClient.getPaymentDetails(orderId);

            if (callbackPaymentHash != null
                    && details.paymentHash() != null
                    && !Objects.equals(callbackPaymentHash, details.paymentHash())) {
                log.warn("BOG iPay callback payment_hash mismatch for order_id={}", orderId);
                return ResponseEntity.ok("OK");
            }

            if ("success".equalsIgnoreCase(details.status())) {
                purchaseService.handleCheckoutCompleted(
                        details.orderId(),
                        details.ipayPaymentId(),
                        details.transactionId()
                );
            } else {
                log.info("BOG iPay callback for order_id={} not in success state: status={}, callbackStatus={}",
                        orderId, details.status(), callbackStatus);
            }
        } catch (Exception e) {
            log.error("Failed to process BOG iPay callback for order_id={}", orderId, e);
            // Return 200 anyway — we'll reconcile via getPaymentDetails on user return,
            // and BOG retrying won't help if our verification fetch is failing.
            return ResponseEntity.ok("OK");
        }

        return ResponseEntity.ok("OK");
    }
}
