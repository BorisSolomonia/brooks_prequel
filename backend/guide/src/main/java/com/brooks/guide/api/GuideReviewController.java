package com.brooks.guide.api;

import com.brooks.guide.dto.GuideReviewRequest;
import com.brooks.guide.dto.GuideReviewListResponse;
import com.brooks.guide.dto.GuideReviewResponse;
import com.brooks.guide.dto.ReviewVoteRequest;
import com.brooks.guide.service.GuideReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GuideReviewController {

    private final GuideReviewService guideReviewService;

    @PostMapping("/me/trips/{tripId}/review")
    public ResponseEntity<GuideReviewResponse> submitReview(
            Authentication authentication,
            @PathVariable UUID tripId,
            @Valid @RequestBody GuideReviewRequest request) {
        return ResponseEntity.ok(guideReviewService.submitReview(subject(authentication), tripId, request));
    }

    @PostMapping("/guides/{guideId}/reviews/me")
    public ResponseEntity<GuideReviewResponse> upsertMyReview(
            Authentication authentication,
            @PathVariable UUID guideId,
            @Valid @RequestBody GuideReviewRequest request) {
        return ResponseEntity.ok(guideReviewService.upsertMyReview(subject(authentication), guideId, request));
    }

    @DeleteMapping("/guides/{guideId}/reviews/me")
    public ResponseEntity<Void> deleteMyReview(
            Authentication authentication,
            @PathVariable UUID guideId) {
        guideReviewService.deleteMyReview(subject(authentication), guideId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/guides/{guideId}/reviews")
    public ResponseEntity<GuideReviewListResponse> getReviews(
            Authentication authentication,
            @PathVariable UUID guideId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(guideReviewService.getReviews(
                guideId,
                authentication != null ? subject(authentication) : null,
                page,
                size
        ));
    }

    @PostMapping("/guides/{guideId}/reviews/{reviewId}/vote")
    public ResponseEntity<GuideReviewResponse> vote(
            Authentication authentication,
            @PathVariable UUID guideId,
            @PathVariable UUID reviewId,
            @Valid @RequestBody ReviewVoteRequest request) {
        return ResponseEntity.ok(guideReviewService.vote(subject(authentication), guideId, reviewId, request));
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
