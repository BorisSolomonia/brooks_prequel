package com.brooks.community.api;

import com.brooks.community.dto.*;
import com.brooks.community.service.PlaceQaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Right Now v2 · Phase A2 — free-text + preset Place Q&A. All endpoints authenticated. Asking is
 * remote-allowed (sends no coordinate); only answering sends a coordinate (transient presence).
 */
@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class PlaceQaController {

    private final PlaceQaService qaService;

    @PostMapping("/places/{placeId}/questions")
    public ResponseEntity<QuestionCreatedResponse> ask(
            Authentication authentication,
            @PathVariable UUID placeId,
            @Valid @RequestBody AskQuestionRequest request) {
        return ResponseEntity.ok(qaService.ask(subject(authentication), placeId, request));
    }

    @GetMapping("/places/{placeId}/questions")
    public ResponseEntity<List<QuestionView>> questions(
            Authentication authentication,
            @PathVariable UUID placeId) {
        return ResponseEntity.ok(qaService.listQuestions(subject(authentication), placeId));
    }

    @PostMapping("/questions/{questionId}/answers")
    public ResponseEntity<AnswerCreatedResponse> answer(
            Authentication authentication,
            @PathVariable UUID questionId,
            @Valid @RequestBody AnswerRequest request) {
        return ResponseEntity.ok(qaService.answer(subject(authentication), questionId, request));
    }

    @PostMapping("/answers/{answerId}/helpful")
    public ResponseEntity<Void> helpful(
            Authentication authentication,
            @PathVariable UUID answerId) {
        qaService.voteHelpful(subject(authentication), answerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/answers/{answerId}/flag")
    public ResponseEntity<Void> flag(
            Authentication authentication,
            @PathVariable UUID answerId,
            @Valid @RequestBody RightNowFlagRequest request) {
        qaService.flagAnswer(subject(authentication), answerId, request);
        return ResponseEntity.noContent().build();
    }

    private String subject(Authentication authentication) {
        return ((Jwt) authentication.getPrincipal()).getSubject();
    }
}
