package com.brooks.memory.dto;

import com.brooks.memory.domain.MemoryVisibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
public class MemoryUpdateRequest {
    @Size(max = 500)
    private String textContent;
    private String placeLabel;
    private MemoryVisibility visibility;
    private Instant expiresAt;

    @Valid
    @Size(max = 2)
    private List<MemoryMediaRequest> media;
}
