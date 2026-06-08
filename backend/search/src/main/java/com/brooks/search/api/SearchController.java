package com.brooks.search.api;

import com.brooks.common.dto.PageResponse;
import com.brooks.search.dto.*;
import com.brooks.search.service.SearchService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
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
    public ResponseEntity<UnifiedSearchResponse> unifiedSearch(
            @RequestParam("q") @NotBlank @Size(max = 200) String query) {
        return ResponseEntity.ok(searchService.unifiedSearch(query));
    }

    // q is optional here so the page can browse + filter the whole catalogue
    // (rating / verified / sort) without a typed search term. unifiedSearch
    // below still requires a query.
    @GetMapping("/creators")
    public ResponseEntity<PageResponse<CreatorSearchResult>> searchCreators(
            @RequestParam(name = "q", required = false) @Size(max = 200) String query,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) int size,
            @RequestParam(name = "minRating", required = false) Double minRating,
            @RequestParam(name = "verified", required = false) Boolean verified,
            @RequestParam(name = "sort", required = false) String sort) {
        return ResponseEntity.ok(searchService.searchCreators(query, page, Math.min(size, 50), minRating, verified, sort));
    }

    @GetMapping("/guides")
    public ResponseEntity<PageResponse<GuideSearchResult>> searchGuides(
            @RequestParam(name = "q", required = false) @Size(max = 200) String query,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) int size,
            @RequestParam(name = "stage", required = false) String stage,
            @RequestParam(name = "persona", required = false) List<String> personas,
            @RequestParam(name = "minRating", required = false) Double minRating,
            @RequestParam(name = "minPrice", required = false) Integer minPriceCents,
            @RequestParam(name = "maxPrice", required = false) Integer maxPriceCents,
            @RequestParam(name = "sort", required = false) String sort) {
        return ResponseEntity.ok(searchService.searchGuides(
                query, page, Math.min(size, 50), stage, personas, minRating, minPriceCents, maxPriceCents, sort));
    }

    // Authenticated "Discover" feed (BOR-27). Requires a valid token (enforced in
    // SecurityConfig) so the viewer is processed server-side; ranks all published
    // guides by the global relevance composite. The viewer subject is the seam for
    // future per-user personalization — it is read here but does not yet alter ranking.
    @GetMapping("/guides/feed")
    public ResponseEntity<PageResponse<GuideSearchResult>> discoverGuides(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) int size) {
        String viewerSubject = ((Jwt) authentication.getPrincipal()).getSubject();
        return ResponseEntity.ok(searchService.discoverGuides(viewerSubject, page, Math.min(size, 50)));
    }

    @GetMapping("/guides/catalog")
    public ResponseEntity<PageResponse<GuideSearchResult>> catalogGuides(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "50") @Min(1) int size) {
        return ResponseEntity.ok(searchService.catalogGuides(page, Math.min(size, 100)));
    }

    @GetMapping("/places")
    public ResponseEntity<PageResponse<PlaceSearchResult>> searchPlaces(
            @RequestParam("q") @NotBlank @Size(max = 200) String query,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) int size) {
        return ResponseEntity.ok(searchService.searchPlaces(query, page, Math.min(size, 50)));
    }
}
