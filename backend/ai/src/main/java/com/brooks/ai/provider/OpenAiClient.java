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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

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
                           List<ToolSpec> tools, SseEmitter emitter) throws IOException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model != null ? model : DEFAULT_MODEL);
        payload.put("stream", true);
        payload.put("messages", buildMessages(systemPrompt, history, userMessage));
        if (tools != null && !tools.isEmpty()) {
            payload.put("tools", toOpenAiTools(tools));
            payload.put("tool_choice", "auto");
        }
        String body = mapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        // Accumulate streamed tool-call fragments by index (name arrives once, arguments in chunks).
        Map<Integer, String> toolNames = new TreeMap<>();
        Map<Integer, StringBuilder> toolArgs = new TreeMap<>();

        http.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> {
                    try {
                        response.body().forEach(line -> {
                            if (!line.startsWith("data: ")) return;
                            String data = line.substring(6).trim();
                            if ("[DONE]".equals(data)) return;
                            try {
                                JsonNode delta = mapper.readTree(data).at("/choices/0/delta");
                                String token = delta.at("/content").asText("");
                                if (!token.isEmpty()) {
                                    emitter.send(SseEmitter.event().data(token));
                                }
                                JsonNode toolCalls = delta.at("/tool_calls");
                                if (toolCalls.isArray()) {
                                    for (JsonNode tc : toolCalls) {
                                        int idx = tc.path("index").asInt(0);
                                        String name = tc.at("/function/name").asText(null);
                                        if (name != null && !name.isEmpty()) toolNames.put(idx, name);
                                        String argChunk = tc.at("/function/arguments").asText("");
                                        if (!argChunk.isEmpty()) {
                                            toolArgs.computeIfAbsent(idx, k -> new StringBuilder()).append(argChunk);
                                        }
                                    }
                                }
                            } catch (Exception ignored) {}
                        });
                        // Emit one structured "action" SSE event per completed tool call.
                        for (Map.Entry<Integer, String> e : toolNames.entrySet()) {
                            StringBuilder args = toolArgs.get(e.getKey());
                            if (args == null) continue;
                            try {
                                JsonNode parsed = mapper.readTree(args.toString());
                                Map<String, Object> action = new LinkedHashMap<>();
                                action.put("type", e.getValue());
                                action.put("payload", parsed);
                                emitter.send(SseEmitter.event().name("action").data(mapper.writeValueAsString(action)));
                            } catch (Exception ignored) {
                                // Malformed tool args — skip; the client's text-tag fallback still applies.
                            }
                        }
                        emitter.complete();
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                })
                .exceptionally(ex -> { emitter.completeWithError(ex); return null; });
    }

    private static List<Map<String, Object>> toOpenAiTools(List<ToolSpec> tools) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (ToolSpec t : tools) {
            out.add(Map.of(
                    "type", "function",
                    "function", Map.of(
                            "name", t.name(),
                            "description", t.description(),
                            "parameters", t.parameters())));
        }
        return out;
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
