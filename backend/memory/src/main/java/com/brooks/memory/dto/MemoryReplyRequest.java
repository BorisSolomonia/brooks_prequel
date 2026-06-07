package com.brooks.memory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Body for adding a reply memory to an existing one. Coordinates are NOT accepted — a reply
 * inherits its parent's location (the shared physical spot), so it always pins there.
 */
@Getter
@Setter
public class MemoryReplyRequest {
    @NotBlank
    @Size(max = 500)
    private String textContent;

    @Valid
    @Size(max = 2)
    private List<MemoryMediaRequest> media;
}
