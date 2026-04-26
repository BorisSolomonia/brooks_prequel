package com.brooks.guide.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class GuideGiftRequest {
    @NotNull
    private UUID recipientUserId;
}
