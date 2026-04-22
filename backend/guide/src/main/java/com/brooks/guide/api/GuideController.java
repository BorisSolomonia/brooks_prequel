package com.brooks.guide.api;

import com.brooks.common.dto.PageResponse;
import com.brooks.guide.dto.*;
import com.brooks.guide.service.GuideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GuideController {

    private final GuideService guideService;

    // ── Guide CRUD ──────────────────────────────────────────────

    @PostMapping("/guides")
    public ResponseEntity<GuideResponse> createGuide(
            Authentication authentication,
            @Valid @RequestBody GuideCreateRequest request) {
        String subject = subject(authentication);
        GuideResponse guide = guideService.createGuide(subject, request);
        return ResponseEntity.created(URI.create("/api/guides/" + guide.getId())).body(guide);
    }

    @GetMapping("/guides/{guideId}")
    public ResponseEntity<GuideResponse> getGuide(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guideService.getGuide(subject(authentication), guideId));
    }

    @PatchMapping("/guides/{guideId}")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<GuideResponse> updateGuide(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @Valid @RequestBody GuideUpdateRequest request) {
        return ResponseEntity.ok(guideService.updateGuide(subject(authentication), guideId, request));
    }

    @DeleteMapping("/guides/{guideId}")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<Void> deleteGuide(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        guideService.deleteGuide(subject(authentication), guideId);
        return ResponseEntity.noContent().build();
    }

    // ── Day CRUD ────────────────────────────────────────────────

    @PostMapping("/guides/{guideId}/days")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<GuideDayResponse> addDay(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @Valid @RequestBody GuideDayRequest request) {
        GuideDayResponse day = guideService.addDay(subject(authentication), guideId, request);
        return ResponseEntity.created(URI.create("/api/guides/" + guideId + "/days/" + day.getId())).body(day);
    }

    @PatchMapping("/guides/{guideId}/days/{dayId}")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<GuideDayResponse> updateDay(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @PathVariable(name = "dayId") UUID dayId,
            @Valid @RequestBody GuideDayRequest request) {
        return ResponseEntity.ok(guideService.updateDay(subject(authentication), guideId, dayId, request));
    }

    @DeleteMapping("/guides/{guideId}/days/{dayId}")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<Void> deleteDay(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @PathVariable(name = "dayId") UUID dayId) {
        guideService.deleteDay(subject(authentication), guideId, dayId);
        return ResponseEntity.noContent().build();
    }

    // ── Block CRUD ──────────────────────────────────────────────

    @PostMapping("/guides/{guideId}/days/{dayId}/blocks")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<GuideBlockResponse> addBlock(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @PathVariable(name = "dayId") UUID dayId,
            @Valid @RequestBody GuideBlockRequest request) {
        GuideBlockResponse block = guideService.addBlock(subject(authentication), guideId, dayId, request);
        return ResponseEntity.created(URI.create("/api/guides/" + guideId + "/blocks/" + block.getId())).body(block);
    }

    @PatchMapping("/guides/{guideId}/blocks/{blockId}")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<GuideBlockResponse> updateBlock(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @PathVariable(name = "blockId") UUID blockId,
            @Valid @RequestBody GuideBlockRequest request) {
        return ResponseEntity.ok(guideService.updateBlock(subject(authentication), guideId, blockId, request));
    }

    @DeleteMapping("/guides/{guideId}/days/{dayId}/blocks/{blockId}")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<Void> deleteBlock(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @PathVariable(name = "dayId") UUID dayId,
            @PathVariable(name = "blockId") UUID blockId) {
        guideService.deleteBlock(subject(authentication), guideId, dayId, blockId);
        return ResponseEntity.noContent().build();
    }

    // ── Place CRUD ──────────────────────────────────────────────

    @PostMapping("/guides/{guideId}/blocks/{blockId}/places")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<GuidePlaceResponse> addPlace(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @PathVariable(name = "blockId") UUID blockId,
            @Valid @RequestBody GuidePlaceRequest request) {
        GuidePlaceResponse place = guideService.addPlace(subject(authentication), guideId, blockId, request);
        return ResponseEntity.created(URI.create("/api/guides/" + guideId + "/places/" + place.getId())).body(place);
    }

    @PatchMapping("/guides/{guideId}/places/{placeId}")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<GuidePlaceResponse> updatePlace(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @PathVariable(name = "placeId") UUID placeId,
            @Valid @RequestBody GuidePlaceRequest request) {
        return ResponseEntity.ok(guideService.updatePlace(subject(authentication), guideId, placeId, request));
    }

    @DeleteMapping("/guides/{guideId}/blocks/{blockId}/places/{placeId}")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<Void> deletePlace(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId,
            @PathVariable(name = "blockId") UUID blockId,
            @PathVariable(name = "placeId") UUID placeId) {
        guideService.deletePlace(subject(authentication), guideId, blockId, placeId);
        return ResponseEntity.noContent().build();
    }

    // ── Publish ─────────────────────────────────────────────────

    @PostMapping("/guides/{guideId}/publish")
    @PreAuthorize("@guideAuthz.canEdit(authentication, #guideId)")
    public ResponseEntity<GuideResponse> publishGuide(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guideService.publishGuide(subject(authentication), guideId));
    }

    // ── Preview (public) ────────────────────────────────────────

    @GetMapping("/guides/{guideId}/preview")
    public ResponseEntity<GuidePreviewResponse> getPreview(@PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guideService.getPreview(guideId));
    }

    // ── My Guides ───────────────────────────────────────────────

    @GetMapping("/me/guides")
    public ResponseEntity<PageResponse<GuideListItemResponse>> getMyGuides(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(guideService.getMyGuides(subject(authentication), page, size));
    }

    @GetMapping("/me/guides/library")
    public ResponseEntity<GuideLibraryResponse> getGuideLibrary(Authentication authentication) {
        return ResponseEntity.ok(guideService.getGuideLibrary(subject(authentication)));
    }

    @GetMapping("/guides/{guideId}/save-status")
    public ResponseEntity<GuideSaveStatusResponse> getSaveStatus(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guideService.getSaveStatus(subject(authentication), guideId));
    }

    @PostMapping("/guides/{guideId}/save")
    public ResponseEntity<GuideSaveStatusResponse> saveGuide(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guideService.saveGuide(subject(authentication), guideId));
    }

    @DeleteMapping("/guides/{guideId}/save")
    public ResponseEntity<GuideSaveStatusResponse> unsaveGuide(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guideService.unsaveGuide(subject(authentication), guideId));
    }

    // ── Creator Guides (public) ────────────────────────────────

    @GetMapping("/creators/{username}/guides")
    public ResponseEntity<PageResponse<GuideListItemResponse>> getCreatorGuides(
            @PathVariable(name = "username") String username,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(guideService.getCreatorPublishedGuides(username, page, size));
    }

    // ── Util ────────────────────────────────────────────────────

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
