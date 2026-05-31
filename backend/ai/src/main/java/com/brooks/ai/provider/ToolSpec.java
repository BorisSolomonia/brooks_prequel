package com.brooks.ai.provider;

import java.util.Map;

/**
 * Provider-neutral tool/function definition. Each AiClient translates these into its own
 * tool-calling format (OpenAI {@code tools}, Anthropic {@code tools}, Gemini
 * {@code functionDeclarations}). {@code parameters} is a JSON-Schema object.
 */
public record ToolSpec(String name, String description, Map<String, Object> parameters) {}
