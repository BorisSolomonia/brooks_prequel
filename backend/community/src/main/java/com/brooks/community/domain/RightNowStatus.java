package com.brooks.community.domain;

/**
 * The structured condition a responder reports about a public place. Deliberately a
 * closed vocabulary (no free text in v1) so it is corroborable and non-defamatory.
 * "dangerous"/"unsafe" are intentionally NOT here — they route to moderation, never auto-publish.
 */
public enum RightNowStatus {
    QUIET,
    NORMAL,
    BUSY,
    CLOSED
}
