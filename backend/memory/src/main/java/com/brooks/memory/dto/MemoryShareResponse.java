package com.brooks.memory.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MemoryShareResponse {
    private String token;
    private String shareUrl;
}
