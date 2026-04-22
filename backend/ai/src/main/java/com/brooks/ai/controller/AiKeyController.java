package com.brooks.ai.controller;

import com.brooks.ai.dto.AiKeyResponse;
import com.brooks.ai.dto.SaveAiKeyRequest;
import com.brooks.ai.provider.AiProvider;
import com.brooks.ai.service.AiKeyService;
import com.brooks.auth.service.AuthService;
import com.brooks.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/ai-keys")
@RequiredArgsConstructor
public class AiKeyController {

    private final AiKeyService keyService;
    private final AuthService authService;
    private final UserService userService;

    @GetMapping
    public List<AiKeyResponse> list(Authentication auth) {
        UUID userId = resolveUserId(auth);
        return keyService.listKeys(userId);
    }

    @PutMapping
    public AiKeyResponse save(Authentication auth, @RequestBody @Valid SaveAiKeyRequest req) {
        UUID userId = resolveUserId(auth);
        return keyService.saveKey(userId, req.provider(), req.rawKey(), req.model());
    }

    @DeleteMapping("/{provider}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth, @PathVariable AiProvider provider) {
        UUID userId = resolveUserId(auth);
        keyService.deleteKey(userId, provider);
    }

    private UUID resolveUserId(Authentication auth) {
        return ControllerUtils.resolveUserId(auth, authService, userService);
    }
}
