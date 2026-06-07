package com.brooks.common.event;

import java.util.UUID;

/**
 * Fired when a user adds a reply memory to a memory that was shared with them. The notification
 * module's listener notifies the PARENT memory's creator ("[name] added their memory to yours!").
 */
public record MemoryReplyCreatedEvent(
        UUID parentMemoryId,
        UUID replyMemoryId,
        UUID parentCreatorUserId,
        UUID replierUserId
) {
}
