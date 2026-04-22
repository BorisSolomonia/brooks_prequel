package com.brooks.social.api;

import com.brooks.social.dto.CreatorStoryStrip;
import com.brooks.social.dto.StoryCreateRequest;
import com.brooks.social.dto.StoryResponse;
import com.brooks.social.service.StoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping
    public ResponseEntity<StoryResponse> createStory(
            Authentication authentication,
            @Valid @RequestBody StoryCreateRequest request) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        StoryResponse story = storyService.createStory(subject, request);
        return ResponseEntity.created(URI.create("/api/stories/" + story.getId())).body(story);
    }

    @DeleteMapping("/{storyId}")
    public ResponseEntity<Void> deleteStory(
            Authentication authentication,
            @PathVariable(name = "storyId") UUID storyId) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        storyService.deleteStory(subject, storyId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/feed")
    public ResponseEntity<List<CreatorStoryStrip>> getFeedStories(Authentication authentication) {
        String subject = ((Jwt) authentication.getPrincipal()).getSubject();
        return ResponseEntity.ok(storyService.getFeedStoryStrips(subject));
    }

    @GetMapping("/creator/{creatorId}")
    public ResponseEntity<List<StoryResponse>> getCreatorStories(@PathVariable(name = "creatorId") UUID creatorId) {
        return ResponseEntity.ok(storyService.getCreatorStories(creatorId));
    }
}
