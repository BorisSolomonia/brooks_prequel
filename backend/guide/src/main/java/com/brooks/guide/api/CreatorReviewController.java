package com.brooks.guide.api;

import com.brooks.guide.dto.CreatorReviewListResponse;
import com.brooks.guide.dto.CreatorReviewRequest;
import com.brooks.guide.dto.CreatorReviewResponse;
import com.brooks.guide.dto.ReviewVoteRequest;
import com.brooks.guide.service.CreatorReviewService;
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
public class CreatorReviewController {

    private final CreatorReviewService creatorReviewService;

    @GetMapping("/creators/{username}/reviews")
    public ResponseEntity<CreatorReviewListResponse> getReviews(
            Authentication authentication,
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(creatorReviewService.getReviews(
                username,
                authentication != null ? subject(authentication) : null,
                page,
                size
        ));
    }

    @PostMapping("/creators/{username}/reviews/me")
    public ResponseEntity<CreatorReviewResponse> upsertMyReview(
            Authentication authentication,
            @PathVariable String username,
            @Valid @RequestBody CreatorReviewRequest request) {
        return ResponseEntity.ok(creatorReviewService.upsertMyReview(subject(authentication), username, request));
    }

    @DeleteMapping("/creators/{username}/reviews/me")
    public ResponseEntity<Void> deleteMyReview(
            Authentication authentication,
            @PathVariable String username) {
        creatorReviewService.deleteMyReview(subject(authentication), username);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/creators/{username}/reviews/{reviewId}/vote")
    public ResponseEntity<CreatorReviewResponse> vote(
            Authentication authentication,
            @PathVariable String username,
            @PathVariable UUID reviewId,
            @Valid @RequestBody ReviewVoteRequest request) {
        return ResponseEntity.ok(creatorReviewService.vote(subject(authentication), username, reviewId, request));
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
