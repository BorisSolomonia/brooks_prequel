package com.brooks.memory.dto;

import java.util.UUID;

/**
 * A user a memory was directly shared with (an active memory_grant beneficiary).
 * Populated only on the "created by me" list so the client can filter My Memories
 * by recipient (BOR-30). Null on all other response paths.
 */
public record MemoryRecipientSummary(
        UUID userId,
        String username,
        String displayName,
        String avatarUrl) {
}
