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
        String sanitized = sanitizeQuery(query);
        if (sanitized.isBlank()) {
            return new PageResponse<>(List.of(), page, size, 0, 0, true);
        }
        long total = searchRepository.countCreators(sanitized);
        List<CreatorSearchResult> content = searchRepository.searchCreators(sanitized, size, page * size);
        int totalPages = (int) Math.ceil((double) total / size);
        return new PageResponse<>(content, page, size, total, totalPages, page >= totalPages - 1);
    }

    public PageResponse<GuideSearchResult> searchGuides(String query, int page, int size) {
        return searchGuides(query, page, size, null, null);
    }

    public PageResponse<GuideSearchResult> searchGuides(String query, int page, int size, String stage, List<String> personas) {
        String sanitized = sanitizeQuery(query);
        if (sanitized.isBlank()) {
            return new PageResponse<>(List.of(), page, size, 0, 0, true);
        }
        List<String> safePersonas = (personas == null) ? Collections.emptyList() : personas;
        long total = searchRepository.countGuides(sanitized, stage, safePersonas);
        List<GuideSearchResult> content = searchRepository.searchGuides(sanitized, size, page * size, stage, safePersonas);
        int totalPages = (int) Math.ceil((double) total / size);
        return new PageResponse<>(content, page, size, total, totalPages, page >= totalPages - 1);
    }

    public PageResponse<GuideSearchResult> catalogGuides(int page, int size) {
        long total = searchRepository.countPublishedGuides();
        List<GuideSearchResult> content = searchRepository.listPublishedGuides(size, page * size);
        int totalPages = (int) Math.ceil((double) total / size);
        return new PageResponse<>(content, page, size, total, totalPages, page >= totalPages - 1);
    }

    public PageResponse<PlaceSearchResult> searchPlaces(String query, int page, int size) {
        String sanitized = sanitizeQuery(query);
        if (sanitized.isBlank()) {
            return new PageResponse<>(List.of(), page, size, 0, 0, true);
        }
        long total = searchRepository.countPlaces(sanitized);
        List<PlaceSearchResult> content = searchRepository.searchPlaces(sanitized, size, page * size);
        int totalPages = (int) Math.ceil((double) total / size);
        return new PageResponse<>(content, page, size, total, totalPages, page >= totalPages - 1);
    }

    String sanitizeQuery(String query) {
        if (query == null) return "";
        return query.replaceAll("[^\\p{L}\\p{N}\\s]", " ").trim();
    }
}
