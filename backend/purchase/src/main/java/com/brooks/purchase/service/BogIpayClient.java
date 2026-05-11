package com.brooks.purchase.service;

import com.brooks.common.util.BusinessConstants;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * HTTP client for Bank of Georgia iPay (https://api.bog.ge/docs/en/payments/).
 *
 * Auth: OAuth 2.0 client_credentials against
 *   {@code https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token}.
 * Bearer JWT, cached until expires_in - 60s.
 *
 * Order lifecycle: createOrder -> user redirected to _links.redirect.href ->
 * BOG callback hits {@code WebhookController} (RSA-signed) -> getPaymentDetails
 * verifies status server-side as a fallback.
 */
@Component
@Slf4j
public class BogIpayClient {

    private static final String METRIC_NAME = "brooks.bog_ipay.call";

    private final BogIpayProperties properties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final MeterRegistry meterRegistry;

    @Value("${app.base-url:${APP_BASE_URL:http://localhost:8080}}")
    private String appBaseUrl;

    @Value("${app.frontend-base-url:${FRONTEND_BASE_URL:http://localhost:3000}}")
    private String frontendBaseUrl;

    private volatile String cachedToken;
    private volatile Instant cachedTokenExpiresAt = Instant.EPOCH;

    public BogIpayClient(BogIpayProperties properties, ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        this.restTemplate = new RestTemplate(factory);
    }

    private <T> T timed(String operation, java.util.function.Supplier<T> action) {
        Timer.Sample sample = Timer.start(meterRegistry);
        String outcome = "success";
        try {
            return action.get();
        } catch (RuntimeException e) {
            outcome = "failure";
            throw e;
        } finally {
            sample.stop(meterRegistry.timer(METRIC_NAME,
                    Tags.of("operation", operation, "outcome", outcome)));
        }
    }

    /**
     * Result of POST /payments/v1/ecommerce/orders.
     * {@code orderId} is the BOG-issued identifier (response field {@code id}).
     * {@code redirectUrl} is the URL the customer must be sent to (from {@code _links.redirect.href}).
     */
    public record CreatedOrder(String orderId, String redirectUrl) {}

    /**
     * Subset of GET /payments/v1/receipt/{order_id} response that we care about.
     * {@code status} is {@code order_status.key} (created/processing/completed/refunded/...).
     * {@code totalAmountMinorUnits} is parsed from {@code purchase_units.transfer_amount}
     * (or {@code request_amount} fallback) — used for amount reconciliation against the
     * stored purchase price.
     */
    public record PaymentDetails(
            String status,
            String orderId,
            String externalOrderId,
            String paymentMethod,
            String cardType,
            String maskedPan,
            String authCode,
            String transactionId,
            String responseCode,
            String responseDescription,
            Long totalAmountMinorUnits,
            String currency
    ) {}

    public record RefundResult(String key, String message, String actionId) {}

    public CreatedOrder createOrder(
            String shopOrderId,
            long amountMinorUnits,
            String description,
            String productId
    ) {
        return timed("createOrder", () -> doCreateOrder(shopOrderId, amountMinorUnits, description, productId));
    }

    private CreatedOrder doCreateOrder(
            String shopOrderId,
            long amountMinorUnits,
            String description,
            String productId
    ) {
        String token = ensureToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        headers.set("Accept-Language", properties.getLocale());
        headers.set("Idempotency-Key", createOrderIdempotencyKey(shopOrderId));

        String amount = formatGel(amountMinorUnits);

        Map<String, Object> basketItem = new LinkedHashMap<>();
        basketItem.put("product_id", productId);
        basketItem.put("quantity", 1);
        basketItem.put("unit_price", amount);
        basketItem.put("description", truncate(description, 150));

        Map<String, Object> purchaseUnits = new LinkedHashMap<>();
        purchaseUnits.put("currency", BusinessConstants.CURRENCY_GEL);
        purchaseUnits.put("total_amount", amount);
        purchaseUnits.put("basket", List.of(basketItem));

        Map<String, Object> redirectUrls = new LinkedHashMap<>();
        redirectUrls.put("success", frontendBaseUrl + "/purchases/success?shop_order_id=" + shopOrderId);
        redirectUrls.put("fail", frontendBaseUrl + "/purchases/failed?shop_order_id=" + shopOrderId);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("callback_url", appBaseUrl + properties.getCallbackPath());
        body.put("external_order_id", shopOrderId);
        body.put("application_type", "web");
        body.put("capture", "automatic");
        body.put("purchase_units", purchaseUnits);
        body.put("redirect_urls", redirectUrls);
        body.put("ttl", properties.getOrderTtlMinutes());

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    properties.getApiBaseUrl() + "/payments/v1/ecommerce/orders",
                    new HttpEntity<>(body, headers),
                    String.class
            );
            JsonNode json = objectMapper.readTree(response.getBody());
            String orderId = text(json, "id");
            if (orderId == null) {
                throw new IllegalStateException("BOG iPay create order response missing 'id'");
            }
            String redirectUrl = textPath(json, "_links", "redirect", "href");
            if (redirectUrl == null) {
                throw new IllegalStateException("BOG iPay create order response missing _links.redirect.href");
            }
            return new CreatedOrder(orderId, redirectUrl);
        } catch (Exception e) {
            log.error("BOG iPay create order failed for shop_order_id={}", shopOrderId, e);
            throw new RuntimeException("Failed to create BOG iPay order", e);
        }
    }

    public PaymentDetails getPaymentDetails(String orderId) {
        return timed("getPaymentDetails", () -> doGetPaymentDetails(orderId));
    }

    private PaymentDetails doGetPaymentDetails(String orderId) {
        String token = ensureToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    properties.getApiBaseUrl() + "/payments/v1/receipt/" + orderId,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );
            JsonNode json = objectMapper.readTree(response.getBody());
            String amountStr = textPath(json, "purchase_units", "transfer_amount");
            if (amountStr == null) {
                amountStr = textPath(json, "purchase_units", "request_amount");
            }
            Long amountMinor = parseGelMinorUnits(amountStr);
            String currency = textPath(json, "purchase_units", "currency_code");
            return new PaymentDetails(
                    textPath(json, "order_status", "key"),
                    text(json, "order_id"),
                    text(json, "external_order_id"),
                    textPath(json, "payment_detail", "transfer_method", "key"),
                    textPath(json, "payment_detail", "card_type"),
                    textPath(json, "payment_detail", "payer_identifier"),
                    textPath(json, "payment_detail", "auth_code"),
                    textPath(json, "payment_detail", "transaction_id"),
                    textPath(json, "payment_detail", "code"),
                    textPath(json, "payment_detail", "code_description"),
                    amountMinor,
                    currency
            );
        } catch (Exception e) {
            log.error("BOG iPay get payment details failed for order_id={}", orderId, e);
            throw new RuntimeException("Failed to fetch BOG iPay payment details", e);
        }
    }

    /**
     * Issues a refund. Pass {@code null} amount for full refund, or minor units for partial.
     */
    public RefundResult refund(String orderId, Long amountMinorUnits) {
        return timed("refund", () -> doRefund(orderId, amountMinorUnits));
    }

    private RefundResult doRefund(String orderId, Long amountMinorUnits) {
        String token = ensureToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        headers.set("Idempotency-Key", refundIdempotencyKey(orderId, amountMinorUnits));

        Map<String, Object> body = new HashMap<>();
        if (amountMinorUnits != null) {
            body.put("amount", formatGel(amountMinorUnits));
        }

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    properties.getApiBaseUrl() + "/payments/v1/payment/refund/" + orderId,
                    new HttpEntity<>(body, headers),
                    String.class
            );
            JsonNode json = objectMapper.readTree(response.getBody());
            return new RefundResult(
                    text(json, "key"),
                    text(json, "message"),
                    text(json, "action_id")
            );
        } catch (Exception e) {
            log.error("BOG iPay refund failed for order_id={}", orderId, e);
            throw new RuntimeException("Failed to refund BOG iPay order", e);
        }
    }

    private synchronized String ensureToken() {
        if (cachedToken != null && Instant.now().isBefore(cachedTokenExpiresAt)) {
            return cachedToken;
        }
        if (properties.getClientId() == null || properties.getSecretKey() == null
                || properties.getClientId().isBlank() || properties.getSecretKey().isBlank()) {
            throw new IllegalStateException("BOG iPay credentials not configured (BOG_IPAY_CLIENT_ID, BOG_IPAY_SECRET_KEY)");
        }
        String basic = Base64.getEncoder().encodeToString(
                (properties.getClientId() + ":" + properties.getSecretKey()).getBytes(StandardCharsets.UTF_8)
        );
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + basic);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    properties.getOauthBaseUrl() + "/auth/realms/bog/protocol/openid-connect/token",
                    new HttpEntity<>(form, headers),
                    String.class
            );
            JsonNode json = objectMapper.readTree(response.getBody());
            String accessToken = json.get("access_token").asText();
            int expiresInSeconds = json.has("expires_in") ? json.get("expires_in").asInt(3600) : 3600;
            this.cachedToken = accessToken;
            this.cachedTokenExpiresAt = Instant.now().plusSeconds(Math.max(60, expiresInSeconds - 60));
            return accessToken;
        } catch (RestClientException e) {
            log.error("BOG iPay token fetch failed", e);
            throw new RuntimeException("Failed to authenticate with BOG iPay", e);
        } catch (Exception e) {
            log.error("BOG iPay token response parse failed", e);
            throw new RuntimeException("Failed to parse BOG iPay token response", e);
        }
    }

    // Idempotency keys are deterministic by operation + target so that BOG dedupes
    // retries instead of opening a second order / issuing a duplicate refund.
    static String createOrderIdempotencyKey(String shopOrderId) {
        return "create:" + shopOrderId;
    }

    static String refundIdempotencyKey(String orderId, Long amountMinorUnits) {
        return "refund:" + orderId + ":" + (amountMinorUnits == null ? "full" : amountMinorUnits);
    }

    private static String formatGel(long minorUnits) {
        long whole = minorUnits / 100;
        long fraction = Math.abs(minorUnits % 100);
        return String.format("%d.%02d", whole, fraction);
    }

    /**
     * Parse a BOG-formatted decimal amount string ("12.34") into minor units (1234).
     * Returns null if the input is null/blank/unparseable so callers can treat it as
     * "unknown" rather than zero — important for amount reconciliation.
     */
    static Long parseGelMinorUnits(String amount) {
        if (amount == null || amount.isBlank()) return null;
        try {
            return new java.math.BigDecimal(amount.trim()).movePointRight(2).longValueExact();
        } catch (Exception e) {
            return null;
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String text(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) return null;
        return node.get(field).asText();
    }

    private static String textPath(JsonNode root, String... path) {
        JsonNode cursor = root;
        for (String segment : path) {
            if (cursor == null || !cursor.has(segment) || cursor.get(segment).isNull()) return null;
            cursor = cursor.get(segment);
        }
        return cursor == null || cursor.isNull() ? null : cursor.asText();
    }
}
