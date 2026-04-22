package com.brooks.purchase.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

@Service
@Slf4j
public class UniPayService {

    @Value("${unipay.merchant-id}")
    private String merchantId;

    @Value("${unipay.secret-key}")
    private String secretKey;

    @Value("${unipay.api-base-url:https://checkout.unipay.com}")
    private String apiBaseUrl;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public UniPayService(ObjectMapper objectMapper) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    public record OrderResult(String checkoutUrl, String orderId) {}

    public OrderResult createOrder(String guideId, String title, long amountCents,
                                   String currency, String buyerEmail,
                                   Map<String, String> metadata) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("MerchantID", merchantId);

        Map<String, Object> body = new HashMap<>();
        body.put("amount", amountCents);
        body.put("currency", currency.toUpperCase());
        body.put("description", title);
        body.put("customer_email", buyerEmail);
        body.put("success_redirect_url", frontendBaseUrl + "/purchases/success?order_id={ORDER_ID}");
        body.put("fail_redirect_url", frontendBaseUrl + "/guides/" + guideId + "/view");
        body.put("webhook_url", appBaseUrl + "/api/webhooks/unipay");
        body.put("metadata", metadata);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    apiBaseUrl + "/api/v3/orders", request, String.class);

            JsonNode json = objectMapper.readTree(response.getBody());
            String orderId = json.get("order_id").asText();
            String checkoutUrl = json.get("checkout_url").asText();

            return new OrderResult(checkoutUrl, orderId);
        } catch (Exception e) {
            log.error("Failed to create UniPay order", e);
            throw new RuntimeException("Failed to create UniPay checkout order", e);
        }
    }

    public boolean verifyWebhookSignature(String payload, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                    secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computed = HexFormat.of().formatHex(hash);
            return computed.equalsIgnoreCase(signature);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Failed to verify UniPay webhook signature", e);
            return false;
        }
    }
}
