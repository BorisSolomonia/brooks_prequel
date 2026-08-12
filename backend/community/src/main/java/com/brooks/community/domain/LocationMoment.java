package com.brooks.community.domain;

import com.brooks.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * An ephemeral, follower-scoped "Moment" pinned to a place (RIGHT_NOW_V2_DESIGN.md §5).
 *
 * Unlike an anonymous Right Now answer, a Moment IS identified to its audience — but its audience
 * is the poster's followers (D-3), never the public. There is no PLACE_PUBLIC visibility, which is
 * precisely what removes the public-polling stalking oracle the RedTeam flagged as the top risk.
 */
@Entity
@Table(name = "location_moments")
@Getter
@Setter
@NoArgsConstructor
public class LocationMoment extends BaseEntity {

    @Column(name = "place_id", nullable = false)
    private UUID placeId;

    /** Shown to the audience (followers). */
    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "media_ref", nullable = false, length = 500)
    private String mediaRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false, length = 10)
    private MomentMediaType mediaType = MomentMediaType.PHOTO;

    @Column(name = "caption", length = 280)
    private String caption;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 20)
    private MomentVisibility visibility = MomentVisibility.FOLLOWERS;

    @Column(name = "delay_minutes", nullable = false)
    private int delayMinutes = 0;

    /** Author panic/hide: an active ghost hides the moment from everyone but keeps the row. */
    @Column(name = "go_ghost", nullable = false)
    private boolean goGhost = false;

    @Column(name = "visible_at", nullable = false)
    private Instant visibleAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "taken_down_at")
    private Instant takenDownAt;

    /** Not yet expired, not taken down, not ghosted. */
    public boolean isLive(Instant now) {
        return expiresAt.isAfter(now) && takenDownAt == null && !goGhost;
    }

    /** Live AND past its (possibly delayed) reveal time — the read-time gate for the audience. */
    public boolean isVisible(Instant now) {
        return isLive(now) && !visibleAt.isAfter(now);
    }
}
