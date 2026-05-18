package com.brooks.memory.domain;

/**
 * How this MemoryGrant came into existence.
 *
 * - LINK_REDEMPTION: the recipient followed a share token (URL) and
 *   redeemed it. share_id points at the MemoryShare row.
 * - DIRECT: the memory creator picked a follower in-app and shared
 *   directly. No share_id needed; the grant is the contract.
 */
public enum MemoryGrantSource {
    LINK_REDEMPTION,
    DIRECT,
}
