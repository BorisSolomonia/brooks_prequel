package com.brooks.memory.dto;

import com.brooks.memory.domain.MemoryMediaType;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class MemoryMediaResponse {
    private UUID id;
    private MemoryMediaType mediaType;
    private String url;
    private String contentType;
    private Long sizeBytes;
}
