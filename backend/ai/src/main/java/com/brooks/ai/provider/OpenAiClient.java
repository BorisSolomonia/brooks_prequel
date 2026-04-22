package com.brooks.ai.provider;

import com.brooks.ai.dto.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
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
public class OpenAiClient implements AiClient {

    private static final String BASE_URL = "https://api.openai.com/v1/chat/completions";
    private static final String DEFAULT_MODEL = "gpt-4o";

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper;

    @Override
    public AiProvider provider() { return AiProvider.OPENAI; }

    @Override
    public String defaultModel() { return DEFAULT_MODEL; }

    @Override
    public void streamChat(String apiKey, String model, String systemPrompt,
                           List<ChatMessage> history, String userMessage,
                           SseEmitter emitter) throws IOException {
        List<Map<String, String>> messages = buildMessages(systemPrompt, history, userMessage);
        String body = mapper.writeValueAsString(Map.of(
                "model", model != null ? model : DEFAULT_MODEL,
                "stream", true,
                "messages", messages
        ));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        http.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> {
                    try {
                        response.body().forEach(line -> {
                            if (!line.startsWith("data: ")) return;
                            String data = line.substring(6).trim();
                            if ("[DONE]".equals(data)) return;
                            try {
                                JsonNode node = mapper.readTree(data);
                                String token = node.at("/choices/0/delta/content").asText("");
                                if (!token.isEmpty()) {
                                    emitter.send(SseEmitter.event().data(token));
                                }
                            } catch (Exception ignored) {}
                        });
                        emitter.complete();
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                })
                .exceptionally(ex -> { emitter.completeWithError(ex); return null; });
    }

    private List<Map<String, String>> buildMessages(String systemPrompt,
                                                    List<ChatMessage> history,
                                                    String userMessage) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        if (history != null) {
            for (ChatMessage msg : history) {
                messages.add(Map.of("role", msg.role(), "content", msg.content()));
            }
        }
        messages.add(Map.of("role", "user", "content", userMessage));
        return messages;
    }
}
