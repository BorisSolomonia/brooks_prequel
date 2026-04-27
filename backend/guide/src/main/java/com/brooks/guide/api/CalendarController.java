package com.brooks.guide.api;

import com.brooks.guide.dto.*;
import com.brooks.guide.service.CalendarService;
import com.brooks.guide.service.GuidePurchaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;
    private final GuidePurchaseService guidePurchaseService;

    @GetMapping("/me/calendar/status")
    public ResponseEntity<CalendarConnectionStatusResponse> status(Authentication authentication) {
        return ResponseEntity.ok(calendarService.status(subject(authentication), email(authentication)));
    }

    @PostMapping("/me/calendar/google/connect")
    public ResponseEntity<CalendarConnectionStatusResponse> connectGoogle(
            Authentication authentication,
            @RequestBody GoogleCalendarConnectRequest request) {
        return ResponseEntity.ok(calendarService.connectGoogle(subject(authentication), email(authentication), request));
    }

    @DeleteMapping("/me/calendar/google")
    public ResponseEntity<Void> disconnectGoogle(Authentication authentication) {
        calendarService.disconnectGoogle(subject(authentication), email(authentication));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/trips/{tripId}/calendar/google/sync")
    public ResponseEntity<?> syncGoogle(
            Authentication authentication,
            @PathVariable(name = "tripId") UUID tripId,
            @RequestBody(required = false) GoogleCalendarSyncRequest request) {
        try {
            return ResponseEntity.ok(calendarService.syncGoogle(subject(authentication), email(authentication), tripId, request));
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
