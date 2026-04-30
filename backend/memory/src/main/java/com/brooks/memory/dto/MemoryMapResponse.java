package com.brooks.memory.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class MemoryMapResponse {
    private List<MemoryMapPinResponse> memories;
}
