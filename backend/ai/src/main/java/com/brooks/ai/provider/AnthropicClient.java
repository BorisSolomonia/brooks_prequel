package com.brooks.ai.provider;

import com.brooks.ai.dto.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AnthropicClient implements AiClient {

    private static final Logger log = LoggerFactory.getLogger(AnthropicClient.class);

    private static final String BASE_URL = "https://api.anthropic.com/v1/messages";
    private static final String DEFAULT_MODEL = "claude-sonnet-4-6";
    private static final String API_VERSION = "2023-06-01";

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper;

    @Override
    public AiProvider provider() { return AiProvider.ANTHROPIC; }

    @Override
    public String defaultModel() { return DEFAULT_MODEL; }

    @Override
    public void streamChat(String apiKey, String model, String systemPrompt,
                           List<ChatMessage> history, String userMessage,
                           List<ToolSpec> tools, SseEmitter emitter) throws IOException {
        // tools: not yet wired for Anthropic — this provider stays on the text-tag protocol.
        List<Map<String, String>> messages = buildMessages(history, userMessage);
        String body = mapper.writeValueAsString(Map.of(
                "model", model != null ? model : DEFAULT_MODEL,
                "max_tokens", 2048,
                "stream", true,
                "system", systemPrompt,
                "messages", messages
        ));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL))
                .header("x-api-key", apiKey)
                .header("anthropic-version", API_VERSION)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<java.util.stream.Stream<String>> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofLines());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IOException("Anthropic request interrupted", interrupted);
        }

        if (response.statusCode() >= 400) {
            String bodySnippet = response.body().limit(20).reduce("", (a, b) -> a + b);
            if (bodySnippet.length() > 500) bodySnippet = bodySnippet.substring(0, 500);
            log.warn("Anthropic API returned status {} for model {}: {}",
                    response.statusCode(), model != null ? model : DEFAULT_MODEL, bodySnippet);
            emitter.completeWithError(new IOException(
                    "Anthropic API error: HTTP " + response.statusCode()));
            return;
        }

        try {
            response.body().forEach(line -> {
                if (!line.startsWith("data: ")) return;
                String data = line.substring(6).trim();
                try {
                    JsonNode node = mapper.readTree(data);
                    if ("content_block_delta".equals(node.path("type").asText(""))) {
                        String token = node.at("/delta/text").asText("");
                        if (!token.isEmpty()) emitter.send(SseEmitter.event().data(token));
                    }
                } catch (Exception parseError) {
                    log.debug("Skipping unparseable Anthropic stream line: {}", parseError.getMessage());
                }
            });
            emitter.complete();
        } catch (Exception e) {
            log.warn("Anthropic stream read failed", e);
            emitter.completeWithError(e);
        }
    }

    private List<Map<String, String>> buildMessages(List<ChatMessage> history, String userMessage) {
        List<Map<String, String>> messages = new ArrayList<>();
        if (history != null) {
            for (ChatMessage msg : history) {
                messages.add(Map.of("role", msg.role(), "content", msg.content()));
            }
        }
        messages.add(Map.of("role", "user", "content", userMessage));
        return messages;
    }
}
