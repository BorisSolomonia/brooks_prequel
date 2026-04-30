package com.brooks.memory.dto;

import com.brooks.memory.domain.MemoryVisibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
public class MemoryCreateRequest {
    @NotBlank
    @Size(max = 500)
    private String textContent;

    @NotNull
    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double latitude;

    @NotNull
    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double longitude;

    @Size(max = 200)
    private String placeLabel;

    private MemoryVisibility visibility = MemoryVisibility.PRIVATE;

    private Instant expiresAt;

    @Valid
    @Size(max = 2)
    private List<MemoryMediaRequest> media;
}
