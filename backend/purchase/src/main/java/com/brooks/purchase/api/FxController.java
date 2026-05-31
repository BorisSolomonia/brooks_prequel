package com.brooks.purchase.api;

import com.brooks.purchase.service.FxRateService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

/**
 * Public FX rates + a location-based currency suggestion for client-side price display. Prices are
 * stored in a guide's BASE currency; the client converts to the buyer's display currency using these
 * GEL-per-unit rates (GEL = 1.0). Display only — the binding charge is computed server-side in GEL.
 *
 * <p>{@code suggestedCurrency} is derived from the country the edge/proxy reports for the request IP
 * (Cloudflare / GCP / common CDN headers). This is the authoritative "opened from Georgia → GEL"
 * signal; if no header is present it is null and the client falls back to timezone.
 */
@RestController
@RequestMapping("/api/fx")
@RequiredArgsConstructor
public class FxController {

    private static final String[] COUNTRY_HEADERS = {
            "Cf-Ipcountry",            // Cloudflare
            "X-Appengine-Country",     // Google Cloud
            "X-Client-Geo-Country",
            "X-Country-Code",
            "X-Geo-Country",
            "X-Vercel-IP-Country"
    };

    private final FxRateService fxRateService;

    @GetMapping("/rates")
    public ResponseEntity<Map<String, Object>> rates(HttpServletRequest request) {
        Map<String, BigDecimal> rates = new TreeMap<>(fxRateService.ratesGelPerUnit());

        String country = detectCountry(request);
        String suggested = fxRateService.countryToCurrency(country);

        Map<String, Object> body = new HashMap<>();
        body.put("base", "GEL");
        body.put("supported", FxRateService.SUPPORTED);
        body.put("gelPerUnit", rates);
        body.put("detectedCountry", country);          // may be null
        body.put("suggestedCurrency", suggested);       // may be null → client falls back to timezone
        return ResponseEntity.ok(body);
    }

    private static String detectCountry(HttpServletRequest request) {
        for (String h : COUNTRY_HEADERS) {
            String v = request.getHeader(h);
            if (v != null && !v.isBlank() && !"XX".equalsIgnoreCase(v.trim())) {
                return v.trim().toUpperCase();
            }
        }
        return null;
    }
}
