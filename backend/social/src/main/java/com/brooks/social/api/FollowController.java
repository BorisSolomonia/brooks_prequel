package com.brooks.social.api;

import com.brooks.social.dto.FollowResponse;
import com.brooks.social.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.brooks.auth.util.AuthPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/{userId}/follow")
    public ResponseEntity<FollowResponse> follow(
            Authentication authentication,
            @PathVariable(name = "userId") UUID userId) {
        String subject = AuthPrincipal.subject(authentication);
        return ResponseEntity.ok(followService.follow(subject, userId));
    }

    @DeleteMapping("/{userId}/follow")
    public ResponseEntity<FollowResponse> unfollow(
            Authentication authentication,
            @PathVariable(name = "userId") UUID userId) {
        String subject = AuthPrincipal.subject(authentication);
        return ResponseEntity.ok(followService.unfollow(subject, userId));
    }

    @GetMapping("/{userId}/follow-status")
    public ResponseEntity<FollowResponse> getFollowStatus(
            Authentication authentication,
            @PathVariable(name = "userId") UUID userId) {
        String subject = AuthPrincipal.subject(authentication);
        return ResponseEntity.ok(followService.getFollowStatus(subject, userId));
    }
}
