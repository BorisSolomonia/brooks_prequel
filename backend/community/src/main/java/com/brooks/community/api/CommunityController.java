package com.brooks.community.api;

import com.brooks.community.domain.ConsentPurpose;
import com.brooks.community.dto.*;
import com.brooks.community.service.RightNowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * BOR-86 "Right Now". All endpoints authenticated (SecurityConfig denies /api/** by default).
 * Only the report-submit path ever receives a coordinate; viewing and asking send none.
 */
@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final RightNowService rightNowService;

    @GetMapping("/places")
    public ResponseEntity<List<CommunityPlaceResponse>> places(
            Authentication authentication,
            @RequestParam double north,
            @RequestParam double south,
            @RequestParam double east,
            @RequestParam double west) {
        return ResponseEntity.ok(rightNowService.listPlaces(subject(authentication), north, south, east, west));
    }

    @GetMapping("/places/search")
    public ResponseEntity<List<CommunityPlaceResponse>> searchPlaces(
            Authentication authentication,
            @RequestParam("q") String query,
            @RequestParam(value = "city", required = false) String city) {
        return ResponseEntity.ok(rightNowService.searchPlaces(subject(authentication), query, city));
    }

    @GetMapping("/places/{placeId}/right-now")
    public ResponseEntity<RightNowFeedResponse> rightNow(
            Authentication authentication,
            @PathVariable UUID placeId) {
        return ResponseEntity.ok(rightNowService.getRightNow(subject(authentication), placeId));
    }

    @PostMapping("/places/{placeId}/ask")
    public ResponseEntity<AskResponse> ask(
            Authentication authentication,
            @PathVariable UUID placeId) {
        return ResponseEntity.ok(rightNowService.ask(subject(authentication), placeId));
    }

    @PostMapping("/places/{placeId}/reports")
    public ResponseEntity<ReportCreatedResponse> submitReport(
            Authentication authentication,
            @PathVariable UUID placeId,
            @Valid @RequestBody RightNowSubmitRequest request) {
        return ResponseEntity.ok(rightNowService.submitReport(subject(authentication), placeId, request));
    }

    @PostMapping("/reports/{reportId}/helpful")
    public ResponseEntity<Void> helpful(
            Authentication authentication,
            @PathVariable UUID reportId) {
        rightNowService.voteHelpful(subject(authentication), reportId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reports/{reportId}/flag")
    public ResponseEntity<Void> flag(
            Authentication authentication,
            @PathVariable UUID reportId,
            @Valid @RequestBody RightNowFlagRequest request) {
        rightNowService.flagReport(subject(authentication), reportId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reports/{reportId}/share-public")
    public ResponseEntity<Void> sharePublic(
            Authentication authentication,
            @PathVariable UUID reportId) {
        rightNowService.sharePublic(subject(authentication), reportId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/contributors/{userId}/block")
    public ResponseEntity<Void> block(
            Authentication authentication,
            @PathVariable UUID userId) {
        rightNowService.block(subject(authentication), userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/contributors/{userId}/block")
    public ResponseEntity<Void> unblock(
            Authentication authentication,
            @PathVariable UUID userId) {
        rightNowService.unblock(subject(authentication), userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/consent/{purpose}")
    public ResponseEntity<Void> grantConsent(
            Authentication authentication,
            @PathVariable ConsentPurpose purpose) {
        rightNowService.grantConsent(subject(authentication), purpose);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/consent/{purpose}")
    public ResponseEntity<Void> withdrawConsent(
            Authentication authentication,
            @PathVariable ConsentPurpose purpose) {
        rightNowService.withdrawConsent(subject(authentication), purpose);
        return ResponseEntity.noContent().build();
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
