package com.brooks.purchase.api;

import com.brooks.common.dto.PageResponse;
import com.brooks.common.util.Pagination;
import com.brooks.purchase.dto.AdminTransactionResponse;
import com.brooks.purchase.service.AdminTransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

/**
 * Admin transaction log. ADMIN-only via SecurityConfig (/api/admin/** → hasRole("ADMIN")).
 * Lists every completed sale with full detail and supports date-range / creator / guide filtering
 * plus CSV export for accounting and payouts.
 */
@RestController
@RequestMapping("/api/admin/transactions")
@RequiredArgsConstructor
public class AdminTransactionController {

    private final AdminTransactionService service;

    @GetMapping
    public ResponseEntity<PageResponse<AdminTransactionResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) UUID creatorId,
            @RequestParam(required = false) UUID guideId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var filters = new AdminTransactionService.Filters(from, to, creatorId, guideId);
        return ResponseEntity.ok(service.list(filters, Pagination.clampPage(page), Pagination.clampSize(size)));
    }

    @GetMapping("/export.csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) UUID creatorId,
            @RequestParam(required = false) UUID guideId) {
        var filters = new AdminTransactionService.Filters(from, to, creatorId, guideId);
        byte[] body = service.exportCsv(filters).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"brooks-transactions.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(body);
    }
}
