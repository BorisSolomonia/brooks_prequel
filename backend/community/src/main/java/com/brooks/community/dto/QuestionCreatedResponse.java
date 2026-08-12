package com.brooks.community.dto;

import java.util.UUID;

public record QuestionCreatedResponse(UUID id, long expiresInMinutes) {
}
