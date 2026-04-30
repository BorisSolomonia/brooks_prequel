package com.brooks.purchase.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * HTTP client for Bank of Georgia iPay (https://api.bog.ge/docs/en/ipay/).
 *
 * Auth: OAuth 2.0 client_credentials (Bearer JWT), token cached until expiry.
 * Order lifecycle: createOrder -> user redirected to approve link -> callback hits webhook
 * -> getPaymentDetails verifies status server-side (BOG callbacks are unsigned).
 */
@Component
@Slf4j
public class BogIpayClient {

    private final BogIpayProperties properties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    private volatile String cachedToken;
    private volatile Instant cachedTokenExpiresAt = Instant.EPOCH;

    public BogIpayClient(BogIpayProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        this.restTemplate = new RestTemplate(factory);
    }

    public record CreatedOrder(String orderId, String paymentHash, String approveUrl) {}

    public record PaymentDetails(
            String status,
            String orderId,
            String paymentHash,
            String ipayPaymentId,
            String shopOrderId,
            String paymentMethod,
            String cardType,
            String pan,
            String transactionId
    ) {}

    public CreatedOrder createOrder(
            String shopOrderId,
            long amountMinorUnits,
            String description,
            String productId
    ) {
        String token = ensureToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        String amount = formatGel(amountMinorUnits);

        Map<String, Object> item = new HashMap<>();
        item.put("amount", amount);
        item.put("description", truncate(description, 150));
        item.put("quantity", "1");
        item.put("product_id", productId);

        Map<String, Object> purchaseUnit = new HashMap<>();
        Map<String, Object> amountObj = new HashMap<>();
        amountObj.put("currency_code", "GEL");
        amountObj.put("value", amount);
        purchaseUnit.put("amount", amountObj);

        Map<String, Object> body = new HashMap<>();
        body.put("intent", "CAPTURE");
        body.put("items", List.of(item));
        body.put("locale", properties.getLocale());
        body.put("shop_order_id", shopOrderId);
        body.put("redirect_url", frontendBaseUrl + "/purchases/return?shop_order_id=" + shopOrderId);
        body.put("show_shop_order_id_on_extract", false);
        body.put("capture_method", "AUTOMATIC");
        body.put("purchase_units", List.of(purchaseUnit));

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    properties.getBaseUrl() + "/checkout/orders",
                    new HttpEntity<>(body, headers),
                    String.class
            );
            JsonNode json = objectMapper.readTree(response.getBody());
            String orderId = json.get("order_id").asText();
            String paymentHash = json.get("payment_hash").asText();
            String approveUrl = extractRel(json, "approve");
            if (approveUrl == null) {
                throw new IllegalStateException("BOG iPay create order response missing 'approve' link");
            }
            return new CreatedOrder(orderId, paymentHash, approveUrl);
        } catch (Exception e) {
            log.error("BOG iPay create order failed for shop_order_id={}", shopOrderId, e);
            throw new RuntimeException("Failed to create BOG iPay order", e);
        }
    }

    public PaymentDetails getPaymentDetails(String orderId) {
        String token = ensureToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    properties.getBaseUrl() + "/checkout/payment/" + orderId,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );
            JsonNode json = objectMapper.readTree(response.getBody());
            return new PaymentDetails(
                    text(json, "status"),
                    text(json, "order_id"),
                    text(json, "payment_hash"),
                    text(json, "ipay_payment_id"),
                    text(json, "shop_order_id"),
                    text(json, "payment_method"),
                    text(json, "card_type"),
                    text(json, "pan"),
                    text(json, "transaction_id")
            );
        } catch (Exception e) {
            log.error("BOG iPay get payment details failed for order_id={}", orderId, e);
            throw new RuntimeException("Failed to fetch BOG iPay payment details", e);
        }
    }

    /**
     * Issues a refund. Pass null amount for full refund, or minor units for partial.
     */
    public void refund(String orderId, Long amountMinorUnits) {
        String token = ensureToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBearerAuth(token);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("order_id", orderId);
        if (amountMinorUnits != null) {
            form.add("amount", formatGel(amountMinorUnits));
        }

        try {
            restTemplate.postForEntity(
                    properties.getBaseUrl() + "/checkout/refund",
                    new HttpEntity<>(form, headers),
                    String.class
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
                    properties.getBaseUrl() + "/oauth2/token",
                    new HttpEntity<>(form, headers),
                    String.class
            );
            JsonNode json = objectMapper.readTree(response.getBody());
            String accessToken = json.get("access_token").asText();
            int expiresInSeconds = json.has("expires_in") ? json.get("expires_in").asInt(3600) : 3600;
            this.cachedToken = accessToken;
            // Refresh 60s before BOG-reported expiry
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

    private static String formatGel(long minorUnits) {
        long whole = minorUnits / 100;
        long fraction = Math.abs(minorUnits % 100);
        return String.format("%d.%02d", whole, fraction);
    }

    private static String truncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String text(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) return null;
        return node.get(field).asText();
    }

    private static String extractRel(JsonNode response, String rel) {
        JsonNode links = response.get("links");
        if (links == null || !links.isArray()) return null;
        for (JsonNode link : links) {
            if (Objects.equals(text(link, "rel"), rel)) {
                return text(link, "href");
            }
        }
        return null;
    }
}
