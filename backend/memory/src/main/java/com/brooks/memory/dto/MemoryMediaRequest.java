package com.brooks.memory.dto;

import com.brooks.memory.domain.MemoryMediaType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemoryMediaRequest {
    @NotNull
    private MemoryMediaType mediaType;

    @NotBlank
    @Size(max = 700)
    private String url;

    @Size(max = 700)
    private String objectName;

    @Size(max = 120)
    private String contentType;

    private Long sizeBytes;
}
