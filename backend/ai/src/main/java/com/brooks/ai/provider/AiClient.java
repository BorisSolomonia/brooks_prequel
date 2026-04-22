package com.brooks.ai.provider;

import com.brooks.ai.dto.ChatMessage;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

public interface AiClient {

    void streamChat(String apiKey,
                    String model,
                    String systemPrompt,
                    List<ChatMessage> history,
                    String userMessage,
                    SseEmitter emitter) throws IOException;

    AiProvider provider();

    String defaultModel();
}
