package com.brooks.guide.api;

import com.brooks.guide.dto.PlaceReviewListResponse;
import com.brooks.guide.dto.PlaceReviewRequest;
import com.brooks.guide.dto.PlaceReviewResponse;
import com.brooks.guide.service.PlaceReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/me/places")
@RequiredArgsConstructor
public class PlaceReviewController {

    private final PlaceReviewService placeReviewService;

    @PostMapping("/{placeId}/review")
    public ResponseEntity<PlaceReviewResponse> upsertMyReview(
            Authentication authentication,
            @PathVariable UUID placeId,
            @Valid @RequestBody PlaceReviewRequest request) {
        return ResponseEntity.ok(placeReviewService.upsertMyReview(subject(authentication), placeId, request));
    }

    @DeleteMapping("/{placeId}/review")
    public ResponseEntity<Void> deleteMyReview(
            Authentication authentication,
            @PathVariable UUID placeId) {
        placeReviewService.deleteMyReview(subject(authentication), placeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{placeId}/reviews")
    public ResponseEntity<PlaceReviewListResponse> listReviews(
            Authentication authentication,
            @PathVariable UUID placeId) {
        return ResponseEntity.ok(placeReviewService.listReviews(subject(authentication), placeId));
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
