package com.brooks.search.api;

import com.brooks.common.dto.PageResponse;
import com.brooks.search.dto.*;
import com.brooks.search.service.SearchService;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Validated
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<UnifiedSearchResponse> unifiedSearch(@RequestParam("q") String query) {
        return ResponseEntity.ok(searchService.unifiedSearch(query));
    }

    @GetMapping("/creators")
    public ResponseEntity<PageResponse<CreatorSearchResult>> searchCreators(
            @RequestParam("q") String query,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) int size) {
        return ResponseEntity.ok(searchService.searchCreators(query, page, Math.min(size, 50)));
    }

    @GetMapping("/guides")
    public ResponseEntity<PageResponse<GuideSearchResult>> searchGuides(
            @RequestParam("q") String query,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) int size,
            @RequestParam(name = "stage", required = false) String stage,
            @RequestParam(name = "persona", required = false) List<String> personas) {
        return ResponseEntity.ok(searchService.searchGuides(query, page, Math.min(size, 50), stage, personas));
    }

    @GetMapping("/places")
    public ResponseEntity<PageResponse<PlaceSearchResult>> searchPlaces(
            @RequestParam("q") String query,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) int size) {
        return ResponseEntity.ok(searchService.searchPlaces(query, page, Math.min(size, 50)));
    }
}
