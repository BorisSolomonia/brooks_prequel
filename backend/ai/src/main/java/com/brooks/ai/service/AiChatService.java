package com.brooks.ai.service;

import com.brooks.ai.dto.BuyerChatRequest;
import com.brooks.ai.dto.CreatorSuggestRequest;
import com.brooks.ai.provider.AiClient;
import com.brooks.ai.provider.AiProvider;
import com.brooks.guide.dto.GuideBlockResponse;
import com.brooks.guide.dto.GuideDayResponse;
import com.brooks.guide.dto.GuidePlaceResponse;
import com.brooks.guide.dto.GuideResponse;
import com.brooks.guide.repository.GuidePurchaseRepository;
import com.brooks.guide.service.GuideService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
public class AiChatService {

    private final List<AiClient> clientList;
    private final AiKeyService keyService;
    private final GuideService guideService;
    private final GuidePurchaseRepository guidePurchaseRepository;

    // ── Buyer chat ────────────────────────────────────────────────────────────

    public SseEmitter buyerChat(UUID userId, BuyerChatRequest req) {
        var purchase = guidePurchaseRepository.findByIdAndBuyerId(req.tripId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        GuideResponse guide = guideService.getGuideContent(purchase.getGuideId());
        String systemPrompt = BuyerSystemPrompt.build(buildGuideContext(guide));
        var dk = keyService.decryptKey(userId, req.provider());

        return stream(req.provider(), dk.apiKey(), dk.model(), systemPrompt, req.history(), req.userMessage());
    }

    // ── Creator suggest ───────────────────────────────────────────────────────

    public SseEmitter creatorSuggest(UUID userId, CreatorSuggestRequest req) {
        guideService.assertOwner(userId, req.guideId());

        String systemPrompt = CreatorSystemPrompt.build(req.context());
        var dk = keyService.decryptKey(userId, req.provider());

        return stream(req.provider(), dk.apiKey(), dk.model(), systemPrompt, req.history(), req.userMessage());
    }

    // ── Shared streaming logic ────────────────────────────────────────────────

    private SseEmitter stream(AiProvider provider, String apiKey, String model, String systemPrompt,
                              List<com.brooks.ai.dto.ChatMessage> history, String userMessage) {
        SseEmitter emitter = new SseEmitter(120_000L);
        CompletableFuture.runAsync(() -> {
            try {
                getClient(provider).streamChat(apiKey, model, systemPrompt, history, userMessage, emitter);
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    // ── Guide context builder ─────────────────────────────────────────────────

    private String buildGuideContext(GuideResponse guide) {
        StringBuilder sb = new StringBuilder();
        sb.append("GUIDE: ").append(guide.getTitle()).append("\n");
        if (guide.getDescription() != null) sb.append("Description: ").append(guide.getDescription()).append("\n");
        if (guide.getPrimaryCity() != null) {
            sb.append("Location: ").append(guide.getPrimaryCity());
            if (guide.getCountry() != null) sb.append(", ").append(guide.getCountry());
            sb.append("\n");
        }
        if (guide.getTags() != null && !guide.getTags().isEmpty()) {
            sb.append("Tags: ").append(String.join(", ", guide.getTags())).append("\n");
        }
        sb.append("\n");

        if (guide.getDays() != null) {
            for (GuideDayResponse day : guide.getDays()) {
                sb.append("DAY ").append(day.getDayNumber()).append(": ").append(day.getTitle()).append("\n");
                if (day.getDescription() != null) sb.append(day.getDescription()).append("\n");
                if (day.getBlocks() != null) {
                    for (GuideBlockResponse block : day.getBlocks()) {
                        sb.append("  BLOCK: ").append(block.getTitle())
                          .append(" [").append(block.getBlockType()).append("]\n");
                        if (block.getDescription() != null) sb.append("  ").append(block.getDescription()).append("\n");
                        if (block.getPlaces() != null) {
                            for (GuidePlaceResponse place : block.getPlaces()) {
                                sb.append("    PLACE: ").append(place.getName());
                                if (place.getAddress() != null) sb.append(" | ").append(place.getAddress());
                                if (place.getCategory() != null) sb.append(" | ").append(place.getCategory());
                                sb.append("\n");
                                if (place.getDescription() != null) sb.append("    ").append(place.getDescription()).append("\n");
                            }
                        }
                    }
                }
            }
        }
        return sb.toString();
    }

    private AiClient getClient(AiProvider provider) {
        return clientList.stream()
                .filter(c -> c.provider() == provider)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unknown provider: " + provider));
    }
}
