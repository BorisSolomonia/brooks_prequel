package com.brooks.search.service;

import com.brooks.common.dto.PageResponse;
import com.brooks.search.dto.*;
import com.brooks.search.repository.SearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Collections;

@Service
@RequiredArgsConstructor
public class SearchService {

    private static final int UNIFIED_LIMIT = 5;
    private final SearchRepository searchRepository;

    public UnifiedSearchResponse unifiedSearch(String query) {
        String sanitized = sanitizeQuery(query);
        if (sanitized.isBlank()) {
            return UnifiedSearchResponse.builder()
                    .query(query)
                    .creators(List.of()).creatorsTotalCount(0)
                    .guides(List.of()).guidesTotalCount(0)
                    .places(List.of()).placesTotalCount(0)
                    .build();
        }

        return UnifiedSearchResponse.builder()
                .query(query)
                .creators(searchRepository.searchCreators(sanitized, UNIFIED_LIMIT, 0))
                .creatorsTotalCount(searchRepository.countCreators(sanitized))
                .guides(searchRepository.searchGuides(sanitized, UNIFIED_LIMIT, 0))
                .guidesTotalCount(searchRepository.countGuides(sanitized))
                .places(searchRepository.searchPlaces(sanitized, UNIFIED_LIMIT, 0))
                .placesTotalCount(searchRepository.countPlaces(sanitized))
                .build();
    }

    public PageResponse<CreatorSearchResult> searchCreators(String query, int page, int size) {
        return searchCreators(query, page, size, null, null, null);
    }

    // q is optional: a blank query means "browse + filter all active creators"
    // (rating / verified / sort), so we no longer short-circuit on blank.
    public PageResponse<CreatorSearchResult> searchCreators(String query, int page, int size,
                                                            Double minRating, Boolean verified, String sort) {
        String sanitized = sanitizeQuery(query);
        long total = searchRepository.countCreators(sanitized, minRating, verified);
        List<CreatorSearchResult> content =
                searchRepository.searchCreators(sanitized, size, page * size, minRating, verified, sort);
        return PageResponse.of(content, page, size, total);
    }

    public PageResponse<GuideSearchResult> searchGuides(String query, int page, int size) {
        return searchGuides(query, page, size, null, null, null, null, null, null);
    }

    public PageResponse<GuideSearchResult> searchGuides(String query, int page, int size, String stage, List<String> personas) {
        return searchGuides(query, page, size, stage, personas, null, null, null, null);
    }

    // q is optional: a blank query means "browse + filter the whole catalogue".
    public PageResponse<GuideSearchResult> searchGuides(String query, int page, int size, String stage, List<String> personas,
                                                        Double minRating, Integer minPriceCents, Integer maxPriceCents, String sort) {
        String sanitized = sanitizeQuery(query);
        List<String> safePersonas = (personas == null) ? Collections.emptyList() : personas;
        long total = searchRepository.countGuides(sanitized, stage, safePersonas, minRating, minPriceCents, maxPriceCents);
        List<GuideSearchResult> content = searchRepository.searchGuides(
                sanitized, size, page * size, stage, safePersonas, minRating, minPriceCents, maxPriceCents, sort);
        return PageResponse.of(content, page, size, total);
    }

    public PageResponse<GuideSearchResult> catalogGuides(int page, int size) {
        long total = searchRepository.countPublishedGuides();
        List<GuideSearchResult> content = searchRepository.listPublishedGuides(size, page * size);
        return PageResponse.of(content, page, size, total);
    }

    public PageResponse<PlaceSearchResult> searchPlaces(String query, int page, int size) {
        String sanitized = sanitizeQuery(query);
        if (sanitized.isBlank()) {
            return PageResponse.empty(page, size);
        }
        long total = searchRepository.countPlaces(sanitized);
        List<PlaceSearchResult> content = searchRepository.searchPlaces(sanitized, size, page * size);
        return PageResponse.of(content, page, size, total);
    }

    String sanitizeQuery(String query) {
        if (query == null) return "";
        return query.replaceAll("[^\\p{L}\\p{N}\\s]", " ").trim();
    }
}
