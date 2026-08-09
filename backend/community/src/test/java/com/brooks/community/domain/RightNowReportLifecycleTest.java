package com.brooks.community.domain;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The core "expired/removed content is never current" invariant, at the entity gate that every
 * read path uses (BOR86_RIGHT_NOW_DESIGN.md §5, RedTeam F7.1).
 */
class RightNowReportLifecycleTest {

    private RightNowReport report(Instant expiresAt) {
        RightNowReport r = new RightNowReport();
        r.setExpiresAt(expiresAt);
        return r;
    }

    @Test
    void liveWhenNotExpiredHiddenOrDeleted() {
        Instant now = Instant.now();
        assertThat(report(now.plus(Duration.ofMinutes(30))).isLive(now)).isTrue();
    }

    @Test
    void notLiveOnceExpired() {
        Instant now = Instant.now();
        assertThat(report(now.minus(Duration.ofMinutes(1))).isLive(now)).isFalse();
    }

    @Test
    void notLiveWhenModerationHidden() {
        Instant now = Instant.now();
        RightNowReport r = report(now.plus(Duration.ofMinutes(30)));
        r.setHiddenAt(now);
        assertThat(r.isLive(now)).isFalse();
    }

    @Test
    void notLiveWhenDeleted() {
        Instant now = Instant.now();
        RightNowReport r = report(now.plus(Duration.ofMinutes(30)));
        r.setDeletedAt(now);
        assertThat(r.isLive(now)).isFalse();
    }

    @Test
    void publicCardHiddenOnceRevokedEvenIfLive() {
        Instant now = Instant.now();
        RightNowReport r = report(now.plus(Duration.ofMinutes(30)));
        r.setSharedPublic(true);
        assertThat(r.isPublicCardLive(now)).isTrue();
        r.setPublicRevokedAt(now);
        assertThat(r.isPublicCardLive(now)).isFalse();
    }
}
