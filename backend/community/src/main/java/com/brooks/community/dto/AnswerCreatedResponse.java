package com.brooks.community.dto;

import java.util.UUID;

public record AnswerCreatedResponse(UUID id, long expiresInMinutes) {
}
