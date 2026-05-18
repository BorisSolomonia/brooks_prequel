package com.brooks.social.api;

import com.brooks.social.dto.FollowResponse;
import com.brooks.social.dto.FollowerSummaryResponse;
import com.brooks.social.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.brooks.auth.util.AuthPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/users/{userId}/follow")
    public ResponseEntity<FollowResponse> follow(
            Authentication authentication,
            @PathVariable(name = "userId") UUID userId) {
        String subject = AuthPrincipal.subject(authentication);
        return ResponseEntity.ok(followService.follow(subject, userId));
    }

    @DeleteMapping("/users/{userId}/follow")
    public ResponseEntity<FollowResponse> unfollow(
            Authentication authentication,
            @PathVariable(name = "userId") UUID userId) {
        String subject = AuthPrincipal.subject(authentication);
        return ResponseEntity.ok(followService.unfollow(subject, userId));
    }

    @GetMapping("/users/{userId}/follow-status")
    public ResponseEntity<FollowResponse> getFollowStatus(
            Authentication authentication,
            @PathVariable(name = "userId") UUID userId) {
        String subject = AuthPrincipal.subject(authentication);
        return ResponseEntity.ok(followService.getFollowStatus(subject, userId));
    }

    /** Users who follow ME — used by memory composer's follower picker. */
    @GetMapping("/me/followers")
    public ResponseEntity<List<FollowerSummaryResponse>> myFollowers(Authentication authentication) {
        String subject = AuthPrincipal.subject(authentication);
        return ResponseEntity.ok(followService.listFollowersOf(subject));
    }

    /** Users I FOLLOW — used by profile "Following" tab in batch 2C. */
    @GetMapping("/me/following")
    public ResponseEntity<List<FollowerSummaryResponse>> myFollowing(Authentication authentication) {
        String subject = AuthPrincipal.subject(authentication);
        return ResponseEntity.ok(followService.listFollowingOf(subject));
    }
}
