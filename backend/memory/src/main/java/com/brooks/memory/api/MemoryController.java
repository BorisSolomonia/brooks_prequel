package com.brooks.memory.api;

import com.brooks.memory.dto.*;
import com.brooks.memory.service.MemoryDirectShareService;
import com.brooks.memory.service.MemoryService;
import com.brooks.user.service.UserService;
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
    private final MemoryDirectShareService memoryDirectShareService;
    private final UserService userService;

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

    @GetMapping("/me/memories/created")
    public ResponseEntity<java.util.List<MemoryResponse>> listMyCreated(Authentication authentication) {
        return ResponseEntity.ok(memoryService.listMyCreatedMemories(subject(authentication)));
    }

    @GetMapping("/me/memories/shared")
    public ResponseEntity<java.util.List<MemoryResponse>> listSharedWithMe(Authentication authentication) {
        return ResponseEntity.ok(memoryService.listMemoriesSharedWithMe(subject(authentication)));
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

    /**
     * Direct in-app share to a follower. Recipient must currently follow
     * the memory creator. Creates a MemoryGrant with source = DIRECT and
     * fires DirectMemoryShareCreatedEvent (notification module pushes).
     */
    @PostMapping("/memories/{memoryId}/direct-shares")
    public ResponseEntity<Void> shareMemoryWithFollower(
            Authentication authentication,
            @PathVariable UUID memoryId,
            @Valid @RequestBody DirectShareRequest request) {
        UUID creatorId = userService.findByAuth0Subject(subject(authentication)).getId();
        memoryDirectShareService.shareWithFollower(memoryId, creatorId, request.recipientUserId());
        return ResponseEntity.noContent().build();
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
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String subject = jwt.getSubject();
        // Provision the recipient on first reveal — Auth0 afterCallback may have failed silently
        // if the backend was unhealthy when they signed in, leaving a valid JWT with no users row.
        String email = jwt.getClaimAsString("email");
        userService.findOrCreateUser(subject, email == null ? "" : email);
        return ResponseEntity.ok(memoryService.revealShare(subject, token, request));
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
