package com.brooks.ai.controller;

import com.brooks.ai.dto.BuyerChatRequest;
import com.brooks.ai.dto.CreatorSuggestRequest;
import com.brooks.ai.service.AiChatService;
import com.brooks.auth.service.AuthService;
import com.brooks.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService chatService;
    private final AuthService authService;
    private final UserService userService;

    @PostMapping(value = "/buyer-chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter buyerChat(Authentication auth, @RequestBody @Valid BuyerChatRequest req) {
        UUID userId = resolveUserId(auth);
        return chatService.buyerChat(userId, req);
    }

    @PostMapping(value = "/creator-suggest", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter creatorSuggest(Authentication auth, @RequestBody @Valid CreatorSuggestRequest req) {
        UUID userId = resolveUserId(auth);
        return chatService.creatorSuggest(userId, req);
    }

    private UUID resolveUserId(Authentication auth) {
        return ControllerUtils.resolveUserId(auth, authService, userService);
    }
}
