package com.brooks.profile.api;

import com.brooks.profile.dto.InfluencerMapResponse;
import com.brooks.profile.dto.ProfileResponse;
import com.brooks.profile.dto.ProfileUpdateRequest;
import com.brooks.profile.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMyProfile(Authentication authentication) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        return ResponseEntity.ok(profileService.getOrCreateProfile(subject));
    }

    @PatchMapping("/me/profile")
    public ResponseEntity<ProfileResponse> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody ProfileUpdateRequest request) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        return ResponseEntity.ok(profileService.updateProfile(subject, request));
    }

    @GetMapping("/creators/{username}")
    public ResponseEntity<ProfileResponse> getCreatorProfile(@PathVariable(name = "username") String username) {
        return ResponseEntity.ok(profileService.getPublicProfile(username));
    }

    @GetMapping("/maps/influencers")
    public ResponseEntity<InfluencerMapResponse> getInfluencerMap(
            @RequestParam(name = "region", required = false) String region) {
        return ResponseEntity.ok(profileService.getInfluencerMap(region));
    }
}
