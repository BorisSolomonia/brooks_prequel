package com.brooks.notification.api;

import com.brooks.auth.util.AuthPrincipal;
import com.brooks.notification.dto.DeviceTokenRequest;
import com.brooks.notification.service.DeviceTokenService;
import com.brooks.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/me/device-tokens")
@RequiredArgsConstructor
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<Void> register(
            Authentication authentication,
            @Valid @RequestBody DeviceTokenRequest body) {
        String subject = AuthPrincipal.subject(authentication);
        UUID userId = userService.findByAuth0Subject(subject).getId();
        deviceTokenService.upsert(userId, body.token(), body.platform());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{token}")
    public ResponseEntity<Void> unregister(
            Authentication authentication,
            @PathVariable("token") String token) {
        // No need to look up userId here — the token is globally unique and
        // the caller already proved auth.
        AuthPrincipal.subject(authentication);
        deviceTokenService.deleteToken(token);
        return ResponseEntity.noContent().build();
    }
}
