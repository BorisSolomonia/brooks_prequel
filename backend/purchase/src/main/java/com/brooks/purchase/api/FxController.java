package com.brooks.purchase.api;

import com.brooks.purchase.service.FxRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;
import java.util.TreeMap;

/**
 * Public FX rates for client-side price display. Prices are stored in a guide's BASE currency; the
 * client converts to the buyer's display currency using these GEL-per-unit rates (GEL = 1.0).
 * Display only — the binding charge is computed server-side in GEL at checkout.
 */
@RestController
@RequestMapping("/api/fx")
@RequiredArgsConstructor
public class FxController {

    private final FxRateService fxRateService;

    @GetMapping("/rates")
    public ResponseEntity<Map<String, Object>> rates() {
        // Sorted for stable output; values are GEL per 1 unit of the currency.
        Map<String, BigDecimal> rates = new TreeMap<>(fxRateService.ratesGelPerUnit());
        return ResponseEntity.ok(Map.of(
                "base", "GEL",
                "supported", FxRateService.SUPPORTED,
                "gelPerUnit", rates
        ));
    }
}
