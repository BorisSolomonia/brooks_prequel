package com.brooks.purchase.api;

import com.brooks.purchase.service.BogCallbackVerifier;
import com.brooks.purchase.service.PurchaseService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Receives BOG iPay callbacks per https://api.bog.ge/docs/en/payments/standard-process/callback .
 *
 * <ul>
 *   <li>POST application/json — body wraps a {@code body} object with payment details</li>
 *   <li>Signature: {@code Callback-Signature} header (base64), SHA256withRSA over raw body,
 *       verified with the published BOG public key (loaded by {@link BogCallbackVerifier})</li>
 *   <li>Always returns HTTP 200 once we have processed the message — non-200 forces BOG to retry.
 *       Per docs, if a callback is dropped the merchant reconciles via getPaymentDetails on user return.</li>
 *   <li>event = "order_payment" is currently the only event we process</li>
 *   <li>order_status.key values: created, processing, completed, rejected, refund_requested,
 *       refunded, refunded_partially, auth_requested, blocked, partial_completed</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private static final String SIGNATURE_HEADER = "Callback-Signature";
    private static final String EVENT_ORDER_PAYMENT = "order_payment";

    private final BogCallbackVerifier verifier;
    private final PurchaseService purchaseService;
    private final ObjectMapper objectMapper;

    @PostMapping(value = "/bog-ipay", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> handleBogIpayCallback(HttpServletRequest request) throws IOException {
        byte[] rawBody = request.getInputStream().readAllBytes();
        String signature = request.getHeader(SIGNATURE_HEADER);

        if (!verifier.verify(rawBody, signature)) {
            log.warn("Rejecting BOG iPay callback with invalid or missing signature; payload size={}B", rawBody.length);
            return ResponseEntity.status(401).body("invalid signature");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(new String(rawBody, StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("BOG iPay callback body is not valid JSON", e);
            // Malformed payload won't get any better on retry; ack with 200 so BOG stops resending.
            return ResponseEntity.ok("OK");
        }

        String event = textOrNull(root, "event");
        if (!EVENT_ORDER_PAYMENT.equals(event)) {
            log.info("BOG iPay callback ignored: unsupported event={}", event);
            return ResponseEntity.ok("OK");
        }

        JsonNode body = root.get("body");
        if (body == null || body.isNull()) {
            log.warn("BOG iPay callback missing 'body' field");
            return ResponseEntity.ok("OK");
        }

        String orderId = textOrNull(body, "order_id");
        if (orderId == null || orderId.isBlank()) {
            log.warn("BOG iPay callback missing body.order_id");
            return ResponseEntity.ok("OK");
        }

        String statusKey = pathTextOrNull(body, "order_status", "key");
        if (statusKey == null) {
            log.warn("BOG iPay callback missing body.order_status.key for order_id={}", orderId);
            return ResponseEntity.ok("OK");
        }

        String authCode = pathTextOrNull(body, "payment_detail", "auth_code");
        String transactionId = pathTextOrNull(body, "payment_detail", "transaction_id");
        String refundAmount = pathTextOrNull(body, "purchase_units", "refund_amount");

        try {
            switch (statusKey) {
                case "completed" -> purchaseService.handleCheckoutCompleted(orderId, authCode, transactionId);
                case "refunded" -> purchaseService.handleCheckoutRefunded(orderId, refundAmount, false);
                case "refunded_partially" -> purchaseService.handleCheckoutRefunded(orderId, refundAmount, true);
                default -> log.info("BOG iPay callback for order_id={} status={} — no action", orderId, statusKey);
            }
        } catch (Exception e) {
            // Return 5xx so BOG retries per their contract; service layer is idempotent.
            log.error("Failed to process BOG iPay callback for order_id={}", orderId, e);
            return ResponseEntity.status(500).body("processing_failed");
        }
        return ResponseEntity.ok("OK");
    }

    private static String textOrNull(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) return null;
        return node.get(field).asText();
    }

    private static String pathTextOrNull(JsonNode root, String... path) {
        JsonNode cursor = root;
        for (String segment : path) {
            if (cursor == null || !cursor.has(segment) || cursor.get(segment).isNull()) return null;
            cursor = cursor.get(segment);
        }
        return cursor == null || cursor.isNull() ? null : cursor.asText();
    }
}
