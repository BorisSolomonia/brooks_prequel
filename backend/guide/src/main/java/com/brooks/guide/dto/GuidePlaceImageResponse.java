package com.brooks.guide.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class GuidePlaceImageResponse {
    private UUID id;
    private String imageUrl;
    private String caption;
    private int position;
}
