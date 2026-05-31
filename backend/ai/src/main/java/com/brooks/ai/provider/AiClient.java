package com.brooks.ai.provider;

import com.brooks.ai.dto.ChatMessage;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

public interface AiClient {

    /**
     * Stream a chat completion. {@code tools} (nullable) enables native tool calling — a client
     * that supports it surfaces each tool call as a named SSE {@code action} event
     * ({@code event: action / data: {"type":..,"payload":..}}). Clients that don't support tools
     * ignore the param (callers then rely on the legacy text-tag protocol).
     */
    void streamChat(String apiKey,
                    String model,
                    String systemPrompt,
                    List<ChatMessage> history,
                    String userMessage,
                    List<ToolSpec> tools,
                    SseEmitter emitter) throws IOException;

    AiProvider provider();

    String defaultModel();
}
