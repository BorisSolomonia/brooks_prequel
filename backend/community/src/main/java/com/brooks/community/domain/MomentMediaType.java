package com.brooks.community.domain;

/**
 * Moment media kind. Phase A1 launches PHOTO only (Q2); VIDEO is column-allowed so enabling it
 * later is a flag flip, not a migration.
 */
public enum MomentMediaType {
    PHOTO,
    VIDEO
}
