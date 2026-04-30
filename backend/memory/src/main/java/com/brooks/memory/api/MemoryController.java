package com.brooks.memory.api;

import com.brooks.memory.dto.*;
import com.brooks.memory.service.MemoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MemoryController {

    private final MemoryService memoryService;

    @PostMapping("/memories")
    public ResponseEntity<MemoryResponse> createMemory(
            Authentication authentication,
            @Valid @RequestBody MemoryCreateRequest request) {
        MemoryResponse response = memoryService.createMemory(subject(authentication), request);
        return ResponseEntity.created(URI.create("/api/memories/" + response.getId())).body(response);
    }

    @GetMapping("/memories/map")
    public ResponseEntity<MemoryMapResponse> getMapMemories(
            Authentication authentication,
            @RequestParam double north,
            @RequestParam double south,
            @RequestParam double east,
            @RequestParam double west) {
        return ResponseEntity.ok(memoryService.getMapMemories(subject(authentication), north, south, east, west));
    }

    @GetMapping("/memories/{memoryId}")
    public ResponseEntity<MemoryResponse> getMemory(
            Authentication authentication,
            @PathVariable UUID memoryId) {
        return ResponseEntity.ok(memoryService.getMemory(subject(authentication), memoryId));
    }

    @PatchMapping("/memories/{memoryId}")
    public ResponseEntity<MemoryResponse> updateMemory(
            Authentication authentication,
            @PathVariable UUID memoryId,
            @Valid @RequestBody MemoryUpdateRequest request) {
        return ResponseEntity.ok(memoryService.updateMemory(subject(authentication), memoryId, request));
    }

    @DeleteMapping("/memories/{memoryId}")
    public ResponseEntity<Void> deleteMemory(
            Authentication authentication,
            @PathVariable UUID memoryId) {
        memoryService.deleteMemory(subject(authentication), memoryId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/memories/{memoryId}/shares")
    public ResponseEntity<MemoryShareResponse> shareMemory(
            Authentication authentication,
            @PathVariable UUID memoryId) {
        return ResponseEntity.ok(memoryService.shareMemory(subject(authentication), memoryId));
    }

    @GetMapping("/memory-shares/{token}")
    public ResponseEntity<MemoryShareTeaserResponse> getShareTeaser(@PathVariable String token) {
        return ResponseEntity.ok(memoryService.getShareTeaser(token));
    }

    @PostMapping("/memory-shares/{token}/reveal")
    public ResponseEntity<MemoryRevealResponse> revealShare(
            Authentication authentication,
            @PathVariable String token,
            @Valid @RequestBody MemoryRevealRequest request) {
        return ResponseEntity.ok(memoryService.revealShare(subject(authentication), token, request));
    }

    @PostMapping("/memory-creators/{creatorId}/hide-public-memories")
    public ResponseEntity<Void> hideCreatorPublicMemories(
            Authentication authentication,
            @PathVariable UUID creatorId) {
        memoryService.hideCreatorPublicMemories(subject(authentication), creatorId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/memory-creators/{creatorId}/hide-public-memories")
    public ResponseEntity<Void> showCreatorPublicMemories(
            Authentication authentication,
            @PathVariable UUID creatorId) {
        memoryService.showCreatorPublicMemories(subject(authentication), creatorId);
        return ResponseEntity.noContent().build();
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
