package com.brooks.guide.api;

import com.brooks.guide.dto.*;
import com.brooks.guide.service.GuidePurchaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GuidePurchaseController {

    private final GuidePurchaseService guidePurchaseService;

    @PostMapping("/guides/{guideId}/checkout")
    public ResponseEntity<GuideCheckoutSessionResponse> createCheckout(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guidePurchaseService.createCheckoutSession(subject(authentication), email(authentication), guideId));
    }

    @GetMapping("/me/trips")
    public ResponseEntity<MyTripsResponse> getMyTrips(Authentication authentication) {
        return ResponseEntity.ok(guidePurchaseService.getMyTrips(subject(authentication), email(authentication)));
    }

    @GetMapping("/me/trips/{tripId}")
    public ResponseEntity<MyTripDetailResponse> getTrip(
            Authentication authentication,
            @PathVariable(name = "tripId") UUID tripId) {
        return ResponseEntity.ok(guidePurchaseService.getTrip(subject(authentication), email(authentication), tripId));
    }

    @GetMapping("/me/trips/by-guide/{guideId}")
    public ResponseEntity<MyTripSummaryResponse> getTripByGuide(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guidePurchaseService.getTripByGuide(subject(authentication), email(authentication), guideId));
    }

    @PostMapping("/me/guides/{guideId}/trip-copy")
    public ResponseEntity<MyTripSummaryResponse> createCreatorTripCopy(
            Authentication authentication,
            @PathVariable(name = "guideId") UUID guideId) {
        return ResponseEntity.ok(guidePurchaseService.createCreatorTripCopy(subject(authentication), email(authentication), guideId));
    }

    @PatchMapping("/me/trips/{tripId}/setup")
    public ResponseEntity<MyTripDetailResponse> updateTripSetup(
            Authentication authentication,
            @PathVariable(name = "tripId") UUID tripId,
            @Valid @RequestBody MyTripSetupRequest request) {
        return ResponseEntity.ok(guidePurchaseService.updateTripSetup(subject(authentication), email(authentication), tripId, request));
    }

    @PatchMapping("/me/trips/{tripId}/items/{itemId}/visited")
    public ResponseEntity<MyTripItemResponse> toggleVisited(
            Authentication authentication,
            @PathVariable UUID tripId,
            @PathVariable UUID itemId) {
        return ResponseEntity.ok(guidePurchaseService.toggleVisited(subject(authentication), email(authentication), tripId, itemId));
    }

    @GetMapping(value = "/me/trips/{tripId}/calendar.ics")
    public ResponseEntity<?> downloadCalendar(
            Authentication authentication,
            @PathVariable(name = "tripId") UUID tripId,
            @RequestParam(name = "acknowledgedLateItemIds", required = false) Set<UUID> acknowledgedLateItemIds) {
        String filename = "brooks-trip-" + tripId + ".ics";
        try {
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("text/calendar"))
                    .body(guidePurchaseService.buildCalendarFile(
                            subject(authentication),
                            email(authentication),
                            tripId,
                            acknowledgedLateItemIds != null ? acknowledgedLateItemIds : Collections.emptySet()));
        } catch (GuidePurchaseService.LateCalendarEventsException ex) {
            return ResponseEntity.status(409).body(guidePurchaseService.lateEventsResponse(ex.getLateEvents()));
        }
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }

    private String email(Authentication authentication) {
        Object claim = ((Jwt) authentication.getPrincipal()).getClaims().get("email");
        return claim instanceof String ? (String) claim : "";
    }
}
