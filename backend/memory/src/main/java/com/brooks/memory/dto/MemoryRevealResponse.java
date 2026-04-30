package com.brooks.memory.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MemoryRevealResponse {
    private boolean revealed;
    private double distanceMeters;
    private double unlockRadiusMeters;
    private MemoryResponse memory;
}
