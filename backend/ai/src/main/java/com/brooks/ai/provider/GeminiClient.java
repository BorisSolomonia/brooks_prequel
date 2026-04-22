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
public class GeminiClient implements AiClient {

    private static final String BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final String DEFAULT_MODEL = "gemini-2.0-flash";

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper;

    @Override
    public AiProvider provider() { return AiProvider.GEMINI; }

    @Override
    public String defaultModel() { return DEFAULT_MODEL; }

    @Override
    public void streamChat(String apiKey, String model, String systemPrompt,
                           List<ChatMessage> history, String userMessage,
                           SseEmitter emitter) throws IOException {
        String resolvedModel = model != null ? model : DEFAULT_MODEL;
        String url = BASE_URL + resolvedModel + ":streamGenerateContent?alt=sse&key=" + apiKey;

        List<Map<String, Object>> contents = buildContents(history, userMessage);
        String body = mapper.writeValueAsString(Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", contents,
                "generationConfig", Map.of("maxOutputTokens", 2048)
        ));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
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
                                String token = node.at("/candidates/0/content/parts/0/text").asText("");
                                if (!token.isEmpty()) emitter.send(SseEmitter.event().data(token));
                            } catch (Exception ignored) {}
                        });
                        emitter.complete();
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                })
                .exceptionally(ex -> { emitter.completeWithError(ex); return null; });
    }

    private List<Map<String, Object>> buildContents(List<ChatMessage> history, String userMessage) {
        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            for (ChatMessage msg : history) {
                String role = "assistant".equals(msg.role()) ? "model" : "user";
                contents.add(Map.of("role", role, "parts", List.of(Map.of("text", msg.content()))));
            }
        }
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage))));
        return contents;
    }
}
