package com.brooks.social.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class CreatorStoryStrip {
    private UUID creatorId;
    private String creatorUsername;
    private String creatorAvatarUrl;
    private boolean hasActiveStories;
    private List<StoryResponse> stories;
}
