package com.brooks.app.media;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MediaUploadResponse {
    private String url;
    private String objectName;
    private String contentType;
    private long sizeBytes;
}
