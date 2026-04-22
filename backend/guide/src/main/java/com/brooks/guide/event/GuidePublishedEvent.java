package com.brooks.guide.event;

import java.util.UUID;

public record GuidePublishedEvent(UUID guideId, UUID creatorId, int versionNumber) {
}
