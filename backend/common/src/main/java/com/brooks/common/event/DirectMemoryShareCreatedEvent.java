package com.brooks.common.event;

import java.util.UUID;

/**
 * Fired when a memory creator directly shares a memory with one of their
 * followers in-app. The notification module's listener picks this up and
 * pushes a "shared a memory with you" notification to the recipient.
 */
public record DirectMemoryShareCreatedEvent(
        UUID memoryId,
        UUID creatorUserId,
        UUID recipientUserId,
        String memoryTextPreview
) {
}
