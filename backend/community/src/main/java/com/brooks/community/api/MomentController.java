package com.brooks.community.api;

import com.brooks.community.dto.*;
import com.brooks.community.service.MomentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Right Now v2 · Phase A1 — Location Moments (follower-scoped stories). All endpoints authenticated.
 * Only the post path receives a coordinate (used transiently for presence, never stored); reads
 * are follower-scoped and send none.
 */
@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class MomentController {

    private final MomentService momentService;

    @PostMapping("/places/{placeId}/moments")
    public ResponseEntity<MomentCreatedResponse> post(
            Authentication authentication,
            @PathVariable UUID placeId,
            @Valid @RequestBody MomentSubmitRequest request) {
        return ResponseEntity.ok(momentService.postMoment(subject(authentication), placeId, request));
    }

    @GetMapping("/places/{placeId}/moments")
    public ResponseEntity<MomentFeedResponse> placeMoments(
            Authentication authentication,
            @PathVariable UUID placeId) {
        return ResponseEntity.ok(momentService.listPlaceMoments(subject(authentication), placeId));
    }

    @GetMapping("/moments/tray")
    public ResponseEntity<List<MomentView>> tray(Authentication authentication) {
        return ResponseEntity.ok(momentService.listTray(subject(authentication)));
    }

    /** A user's active Moments the viewer may see — powers the profile "moment ring". */
    @GetMapping("/users/{userId}/moments")
    public ResponseEntity<List<MomentView>> userMoments(
            Authentication authentication,
            @PathVariable UUID userId) {
        return ResponseEntity.ok(momentService.listUserMoments(subject(authentication), userId));
    }

    @PostMapping("/moments/{momentId}/view")
    public ResponseEntity<Void> view(
            Authentication authentication,
            @PathVariable UUID momentId,
            @RequestBody(required = false) MomentViewPing ping) {
        Integer dwell = ping == null ? null : ping.dwellMs();
        String session = ping == null ? null : ping.sessionId();
        momentService.recordView(subject(authentication), momentId, dwell, session);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/moments/{momentId}/react")
    public ResponseEntity<Void> react(
            Authentication authentication,
            @PathVariable UUID momentId) {
        momentService.react(subject(authentication), momentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/moments/{momentId}/ghost")
    public ResponseEntity<Void> ghost(
            Authentication authentication,
            @PathVariable UUID momentId,
            @RequestParam(name = "ghost", defaultValue = "true") boolean ghost) {
        momentService.setGhost(subject(authentication), momentId, ghost);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/moments/{momentId}")
    public ResponseEntity<Void> takedown(
            Authentication authentication,
            @PathVariable UUID momentId) {
        momentService.takedown(subject(authentication), momentId);
        return ResponseEntity.noContent().build();
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
