package com.brooks.purchase.service;

import com.brooks.common.util.BusinessConstants;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Foreign-exchange rates for the multi-currency pricing flow.
 *
 * <p>Pricing model: a guide stores a BASE price + base currency (creator-set, e.g. USD). Buyers see
 * the price converted to their local "display" currency (estimate); the actual charge is always in
 * GEL (BOG iPay only settles GEL), converted from the base at checkout time + a small margin to
 * absorb rate movement between display and settlement.
 *
 * <p>Rates come from the National Bank of Georgia (authoritative GEL rates, free), cached daily.
 * Everything is expressed as GEL-per-1-unit-of-currency (GEL itself = 1.0). Cross rates (e.g.
 * USD→EUR for display) go through GEL.
 */
@Service
@Slf4j
public class FxRateService {

    /** Currencies the platform supports for base pricing + display. */
    public static final Set<String> SUPPORTED = BusinessConstants.SUPPORTED_CURRENCIES;

    @Value("${fx.nbg-url:https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/}")
    private String nbgUrl;

    /** Margin (basis points) added to the GEL charge to absorb FX movement. 250 = 2.5%. */
    @Value("${fx.margin-bps:250}")
    private int marginBps;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    // GEL per 1 unit of currency (GEL = 1.0). Refreshed daily; served from cache otherwise.
    private volatile Map<String, BigDecimal> gelPerUnit = Map.of("GEL", BigDecimal.ONE);
    private volatile Instant lastRefresh = Instant.EPOCH;

    public FxRateService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(8_000);
        f.setReadTimeout(8_000);
        this.restTemplate = new RestTemplate(f);
    }

    @jakarta.annotation.PostConstruct
    void init() {
        try {
            refresh();
        } catch (Exception e) {
            log.warn("Initial NBG FX rate load failed; will retry on schedule. {}", e.getMessage());
        }
    }

    /** Refresh NBG rates daily (and a few times in case of transient failures). */
    @Scheduled(fixedDelayString = "${fx.refresh-interval-ms:21600000}", initialDelay = 21_600_000)
    public void scheduledRefresh() {
        try {
            refresh();
        } catch (Exception e) {
            log.warn("Scheduled NBG FX rate refresh failed: {}", e.getMessage());
        }
    }

    synchronized void refresh() {
        try {
            String body = restTemplate.getForObject(nbgUrl, String.class);
            JsonNode root = objectMapper.readTree(body);
            JsonNode currencies = root.isArray() && root.size() > 0 ? root.get(0).get("currencies") : null;
            if (currencies == null || !currencies.isArray()) {
                throw new IllegalStateException("Unexpected NBG response shape");
            }
            Map<String, BigDecimal> next = new HashMap<>();
            next.put("GEL", BigDecimal.ONE);
            for (JsonNode c : currencies) {
                String code = c.path("code").asText(null);
                if (code == null || !SUPPORTED.contains(code)) continue;
                BigDecimal rate = c.path("rate").decimalValue();          // GEL for `quantity` units
                BigDecimal quantity = c.path("quantity").decimalValue();   // usually 1, sometimes 100/1000
                if (rate.signum() <= 0 || quantity.signum() <= 0) continue;
                next.put(code, rate.divide(quantity, 8, RoundingMode.HALF_UP)); // GEL per 1 unit
            }
            this.gelPerUnit = Map.copyOf(next);
            this.lastRefresh = Instant.now();
            log.info("NBG FX rates refreshed: {}", next);
        } catch (Exception e) {
            // keep the previous cache; surface so callers can decide
            throw new RuntimeException("Failed to refresh NBG FX rates", e);
        }
    }

    private BigDecimal gelPer(String currency) {
        String ccy = currency == null ? "GEL" : currency.trim().toUpperCase();
        BigDecimal v = gelPerUnit.get(ccy);
        if (v == null) {
            throw new com.brooks.common.exception.BusinessException("Unsupported currency: " + ccy);
        }
        return v;
    }

    /**
     * Convert a base-currency amount (minor units) to the GEL amount (tetri) to CHARGE, including the
     * configured margin, rounded up to the nearest tetri. This is the binding charge amount.
     */
    public long toGelChargeMinor(long baseMinorUnits, String baseCurrency) {
        BigDecimal base = BigDecimal.valueOf(baseMinorUnits);
        BigDecimal gel = base.multiply(gelPer(baseCurrency)); // still minor units (both /100 scale)
        BigDecimal withMargin = gel.multiply(BigDecimal.valueOf(10_000 + marginBps))
                .divide(BigDecimal.valueOf(10_000), 0, RoundingMode.CEILING);
        return withMargin.longValueExact();
    }

    /**
     * Convert an amount (minor units) from one currency to another at the mid rate (NO margin) — for
     * DISPLAY only. Returns minor units in the target currency.
     */
    public long convertMinorForDisplay(long amountMinorUnits, String from, String to) {
        if (from != null && to != null && from.equalsIgnoreCase(to)) return amountMinorUnits;
        BigDecimal inGel = BigDecimal.valueOf(amountMinorUnits).multiply(gelPer(from));
        BigDecimal out = inGel.divide(gelPer(to), 0, RoundingMode.HALF_UP);
        return out.longValueExact();
    }

    /** GEL-per-unit snapshot for the supported currencies (for the public display endpoint). */
    public Map<String, BigDecimal> ratesGelPerUnit() {
        return gelPerUnit;
    }

    public boolean isSupported(String currency) {
        return currency != null && SUPPORTED.contains(currency.trim().toUpperCase());
    }
}
