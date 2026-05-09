package com.brooks.purchase.service;

import com.brooks.purchase.domain.PurchaseAuditEvent;
import com.brooks.purchase.repository.PurchaseAuditEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Single home for purchase audit-event writes. Replaces the inline
 * {@code recordAuditEvent(purchaseId, type, jsonString)} helper that was scattered
 * through {@code PurchaseService} with format-string JSON.
 *
 * Audit-write failures are logged but never propagate — losing one audit row should
 * not abort a real purchase mutation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PurchaseAuditWriter {

    private static final int MAX_PAYLOAD_LENGTH = 1000;

    private final PurchaseAuditEventRepository repository;

    /** Write an audit event whose payload is built from a key/value map (auto-JSON). */
    public void record(UUID purchaseId, String eventType, Map<String, ?> payload) {
        record(purchaseId, eventType, toJson(payload));
    }

    /** Write an audit event with a pre-formatted JSON payload. */
    public void record(UUID purchaseId, String eventType, String jsonPayload) {
        try {
            String snippet = jsonPayload == null
                    ? null
                    : jsonPayload.substring(0, Math.min(MAX_PAYLOAD_LENGTH, jsonPayload.length()));
            repository.save(new PurchaseAuditEvent(purchaseId, eventType, snippet));
        } catch (Exception e) {
            log.warn("Failed to record purchase audit event purchase_id={} event_type={}",
                    purchaseId, eventType, e);
        }
    }

    private static String toJson(Map<String, ?> payload) {
        if (payload == null || payload.isEmpty()) return "{}";
        // Map-to-JSON without pulling Jackson into the audit hot path — payloads are
        // tiny key/value bags, all values get string-quoted unless they're numbers.
        return payload.entrySet().stream()
                .map(e -> "\"" + escape(e.getKey()) + "\":" + jsonValue(e.getValue()))
                .collect(Collectors.joining(",", "{", "}"));
    }

    private static String jsonValue(Object value) {
        if (value == null) return "null";
        if (value instanceof Number || value instanceof Boolean) return value.toString();
        return "\"" + escape(value.toString()) + "\"";
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    /** Convenience for ordered key/value payloads (preserves insertion order in JSON). */
    public static Map<String, Object> payload(String k1, Object v1) {
        Map<String, Object> m = new LinkedHashMap<>(1);
        m.put(k1, v1);
        return m;
    }
    public static Map<String, Object> payload(String k1, Object v1, String k2, Object v2) {
        Map<String, Object> m = new LinkedHashMap<>(2);
        m.put(k1, v1); m.put(k2, v2);
        return m;
    }
    public static Map<String, Object> payload(String k1, Object v1, String k2, Object v2,
                                              String k3, Object v3) {
        Map<String, Object> m = new LinkedHashMap<>(3);
        m.put(k1, v1); m.put(k2, v2); m.put(k3, v3);
        return m;
    }
    public static Map<String, Object> payload(String k1, Object v1, String k2, Object v2,
                                              String k3, Object v3, String k4, Object v4) {
        Map<String, Object> m = new LinkedHashMap<>(4);
        m.put(k1, v1); m.put(k2, v2); m.put(k3, v3); m.put(k4, v4);
        return m;
    }
}
