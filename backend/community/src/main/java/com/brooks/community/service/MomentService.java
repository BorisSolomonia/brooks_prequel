package com.brooks.community.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.community.domain.*;
import com.brooks.community.dto.*;
import com.brooks.community.repository.*;
import com.brooks.profile.domain.UserProfile;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Right Now v2 · Phase A1 — Location Moments (follower-scoped stories) + the DORMANT value ledger.
 * Design + DPIA: RIGHT_NOW_V2_DESIGN.md. Every guard traces to a decision or a RedTeam finding:
 * follower-scoping (D-3), present-only posting (§9.2), automated caption moderation (Q5), the
 * append-only fraud-forensic ledger recorded-now-paid-later (§7, D-6). Nothing here computes money.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class MomentService {

    private final LocationMomentRepository momentRepository;
    private final LocationMomentViewRepository viewRepository;
    private final ValueEventRepository valueEventRepository;
    private final MomentAudienceRepository audienceRepository;
    private final CommunityPlaceRepository placeRepository;
    private final CommunityBlockRepository blockRepository;
    private final CommunityConsentRepository consentRepository;
    private final FollowGraphReader followGraph;
    private final CaptionModerator captionModerator;
    private final UserService userService;
    private final UserProfileRepository profileRepository;

    @Value("${app.community.moment-ttl-hours:24}")
    private int momentTtlHours;
    @Value("${app.community.moment-post-rate-per-hour:10}")
    private int postRatePerHour;
    @Value("${app.community.max-radius-meters:200}")
    private int maxRadiusMeters;
    @Value("${app.community.dwell-seconds:120}")
    private int dwellSeconds;
    @Value("${app.community.max-delay-minutes:120}")
    private int maxDelayMinutes;

    // ---- Posting ----------------------------------------------------------------------------

    /**
     * Post a Moment. Present-only (same eligibility proof as a Right Now answer): the coordinates
     * are used in memory and discarded. Caption is moderated automatically. Sensitive/kid-related
     * places (Q4) reject Moments when their exclusion toggle is on.
     */
    public MomentCreatedResponse postMoment(String subject, UUID placeId, MomentSubmitRequest req) {
        UUID authorId = userId(subject);
        CommunityPlace place = requirePlace(placeId);
        if (!place.acceptsMoments()) {
            throw new BusinessException("This place isn't available for Moments.");
        }
        requireActiveConsent(authorId, ConsentPurpose.LOCATION_ELIGIBILITY,
                "Location consent is required to post a Moment.");

        int radius = Math.min(place.getRadiusMeters(), maxRadiusMeters);
        boolean inRadius = GeoProximity.within(place.getLatitude(), place.getLongitude(),
                req.latitude(), req.longitude(), req.accuracyMeters(), radius);
        boolean attested = req.attestationToken() != null && !req.attestationToken().isBlank();
        boolean dwellOk = req.dwellSeconds() != null && req.dwellSeconds() >= dwellSeconds;
        // req coordinates go out of scope here — never persisted or logged.
        if (!(inRadius && attested && dwellOk)) {
            throw new BusinessException(
                    "You can only post a Moment while you're at this place, verified, and have stayed a moment.");
        }

        Instant now = Instant.now();
        Instant hourAgo = now.minus(1, ChronoUnit.HOURS);
        if (momentRepository.countByAuthorIdAndCreatedAtAfter(authorId, hourAgo) >= postRatePerHour) {
            throw new BusinessException("You've posted a lot recently — try again later.");
        }

        String caption = captionModerator.moderate(req.caption());
        int delay = clampDelay(req.delayMinutes());

        LocationMoment moment = new LocationMoment();
        moment.setPlaceId(placeId);
        moment.setAuthorId(authorId);
        moment.setMediaRef(req.mediaRef());
        moment.setMediaType(req.mediaType() == null ? MomentMediaType.PHOTO : req.mediaType());
        moment.setCaption(caption);
        moment.setVisibility(req.visibility() == null ? MomentVisibility.FOLLOWERS : req.visibility());
        moment.setDelayMinutes(delay);
        moment.setVisibleAt(now.plus(delay, ChronoUnit.MINUTES));
        moment.setExpiresAt(now.plus(momentTtlHours, ChronoUnit.HOURS));
        moment = momentRepository.save(moment);

        long visibleIn = Math.max(0, Duration.between(now, moment.getVisibleAt()).toMinutes());
        long expiresIn = Math.max(0, Duration.between(now, moment.getExpiresAt()).toMinutes());
        return new MomentCreatedResponse(moment.getId(), visibleIn, expiresIn);
    }

    // ---- Reads (follower-scoped) ------------------------------------------------------------

    /** Moments at a place that the viewer is allowed to see: authors they follow, block-filtered. */
    @Transactional(readOnly = true)
    public MomentFeedResponse listPlaceMoments(String subject, UUID placeId) {
        UUID viewerId = userId(subject);
        CommunityPlace place = requirePlace(placeId);
        List<UUID> following = followGraph.findFollowingIds(viewerId);
        if (following.isEmpty()) {
            return new MomentFeedResponse(placeId, place.getName(), List.of());
        }
        Set<UUID> blocked = Set.copyOf(blockRepository.findBlockedIdsByBlocker(viewerId));
        Instant now = Instant.now();

        List<LocationMoment> visible = momentRepository
                .findByPlaceIdAndAuthorIdInAndVisibleAtBeforeAndExpiresAtAfterAndTakenDownAtIsNullAndGoGhostFalseOrderByCreatedAtDesc(
                        placeId, following, now, now)
                .stream()
                .filter(m -> !blocked.contains(m.getAuthorId()))
                .filter(m -> canSee(viewerId, m))
                .collect(Collectors.toList());
        Map<UUID, AuthorInfo> authors = resolveAuthors(visible);
        List<MomentView> views = visible.stream().map(m -> toView(m, now, authors)).collect(Collectors.toList());
        return new MomentFeedResponse(placeId, place.getName(), views);
    }

    /** The viewer's story tray: Moments from everyone they follow, newest first. */
    @Transactional(readOnly = true)
    public List<MomentView> listTray(String subject) {
        UUID viewerId = userId(subject);
        List<UUID> following = followGraph.findFollowingIds(viewerId);
        if (following.isEmpty()) {
            return List.of();
        }
        Set<UUID> blocked = Set.copyOf(blockRepository.findBlockedIdsByBlocker(viewerId));
        Instant now = Instant.now();
        List<LocationMoment> visible = momentRepository
                .findByAuthorIdInAndVisibleAtBeforeAndExpiresAtAfterAndTakenDownAtIsNullAndGoGhostFalseOrderByCreatedAtDesc(
                        following, now, now)
                .stream()
                .filter(m -> !blocked.contains(m.getAuthorId()))
                .filter(m -> canSee(viewerId, m))
                .collect(Collectors.toList());
        Map<UUID, AuthorInfo> authors = resolveAuthors(visible);
        return visible.stream().map(m -> toView(m, now, authors)).collect(Collectors.toList());
    }

    // ---- Engagement (records into the dormant ledger) ---------------------------------------

    /** Record a view. Writes MOMENT_UNIQUE_VIEW once per viewer and a MOMENT_VIEW per session. */
    public void recordView(String subject, UUID momentId, Integer dwellMs, String sessionId) {
        UUID viewerId = userId(subject);
        LocationMoment moment = requireViewableByFollower(viewerId, momentId);

        boolean firstView = !viewRepository.existsByMomentIdAndViewerId(momentId, viewerId);
        if (firstView) {
            viewRepository.save(new LocationMomentView(momentId, viewerId, dwellMs));
            recordValueEvent(ValueEventType.MOMENT_UNIQUE_VIEW, moment, viewerId, dwellMs, sessionId,
                    keySuffix(viewerId));
        }
        // Every view (incl. repeats) is recorded; a session/random suffix keeps the key unique.
        recordValueEvent(ValueEventType.MOMENT_VIEW, moment, viewerId, dwellMs, sessionId,
                sessionId != null ? sessionId : UUID.randomUUID().toString());
    }

    /** React to a Moment — one reaction per viewer per moment (idempotent). */
    public void react(String subject, UUID momentId) {
        UUID viewerId = userId(subject);
        LocationMoment moment = requireViewableByFollower(viewerId, momentId);
        recordValueEvent(ValueEventType.MOMENT_REACTION, moment, viewerId, null, null, keySuffix(viewerId));
    }

    // ---- Author controls --------------------------------------------------------------------

    /** Toggle "go ghost" (author panic/hide) on the author's own Moment. */
    public void setGhost(String subject, UUID momentId, boolean ghost) {
        LocationMoment moment = requireOwnMoment(subject, momentId);
        moment.setGoGhost(ghost);
        momentRepository.save(moment);
    }

    /** Permanently take down the author's own Moment. */
    public void takedown(String subject, UUID momentId) {
        LocationMoment moment = requireOwnMoment(subject, momentId);
        moment.setTakenDownAt(Instant.now());
        momentRepository.save(moment);
    }

    // ---- Helpers ----------------------------------------------------------------------------

    /** CLOSE_FOLLOWERS moments are visible only to explicitly-listed users; FOLLOWERS ignore it. */
    private boolean canSee(UUID viewerId, LocationMoment m) {
        if (m.getVisibility() == MomentVisibility.CLOSE_FOLLOWERS) {
            return audienceRepository.existsByMomentIdAndAllowedUserId(m.getId(), viewerId);
        }
        return true;
    }

    private LocationMoment requireViewableByFollower(UUID viewerId, UUID momentId) {
        LocationMoment moment = requireMoment(momentId);
        if (moment.getAuthorId().equals(viewerId)) {
            throw new BusinessException("You can't record engagement on your own Moment.");
        }
        if (interactionBlocked(viewerId, moment.getAuthorId())) {
            throw new BusinessException("This interaction isn't available.");
        }
        if (!followGraph.isFollowing(viewerId, moment.getAuthorId())) {
            throw new BusinessException("This Moment isn't available to you.");
        }
        if (!moment.isVisible(Instant.now()) || !canSee(viewerId, moment)) {
            throw new BusinessException("This Moment isn't available.");
        }
        return moment;
    }

    private void recordValueEvent(ValueEventType type, LocationMoment moment, UUID actorId,
                                  Integer dwellMs, String sessionId, String keySuffix) {
        String key = type.name() + ":" + moment.getId() + ":" + keySuffix;
        if (valueEventRepository.existsByIdempotencyKey(key)) {
            return;
        }
        ValueEvent event = new ValueEvent();
        event.setEventType(type);
        event.setSubjectUserId(moment.getAuthorId());   // the earner
        event.setActorUserId(actorId);                  // who generated it (never paid)
        event.setSourceRef(moment.getId());
        event.setPlaceId(moment.getPlaceId());
        event.setPlaceTrafficTier(trafficTier(moment.getPlaceId()));
        event.setRawDwellMs(dwellMs);
        event.setSessionId(sessionId);
        event.setEpochId(LocalDate.ofInstant(Instant.now(), ZoneOffset.UTC).toString());
        event.setIdempotencyKey(key);
        valueEventRepository.save(event);
    }

    private String trafficTier(UUID placeId) {
        return placeRepository.findById(placeId)
                .map(p -> p.getFootfallClass().name())
                .orElse(null);
    }

    private MomentView toView(LocationMoment m, Instant now, Map<UUID, AuthorInfo> authors) {
        AuthorInfo a = authors.get(m.getAuthorId());
        return new MomentView(m.getId(), m.getPlaceId(), m.getAuthorId(),
                a == null ? null : a.name(), a == null ? null : a.avatarUrl(),
                m.getMediaRef(), m.getMediaType(), m.getCaption(), freshness(m.getCreatedAt(), now),
                Math.max(0, Duration.between(now, m.getExpiresAt()).toMinutes()));
    }

    /**
     * Batch-resolve identity for the moment authors (stories are identified to their audience).
     * Prefers the profile display name, falls back to the account username; avatar from profile.
     */
    private Map<UUID, AuthorInfo> resolveAuthors(List<LocationMoment> moments) {
        List<UUID> ids = moments.stream().map(LocationMoment::getAuthorId).distinct().collect(Collectors.toList());
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<UUID, String> displayByUser = new HashMap<>();
        Map<UUID, String> avatarByUser = new HashMap<>();
        for (UserProfile p : profileRepository.findAllByUserIdIn(ids)) {
            displayByUser.put(p.getUserId(), p.getDisplayName());
            avatarByUser.put(p.getUserId(), p.getAvatarUrl());
        }
        Map<UUID, User> users = userService.findAllByIds(ids);
        Map<UUID, AuthorInfo> out = new HashMap<>();
        for (UUID id : ids) {
            String display = displayByUser.get(id);
            String name = (display != null && !display.isBlank()) ? display
                    : users.containsKey(id) ? users.get(id).getUsername() : null;
            out.put(id, new AuthorInfo(name, avatarByUser.get(id)));
        }
        return out;
    }

    private record AuthorInfo(String name, String avatarUrl) {
    }

    private String freshness(Instant createdAt, Instant now) {
        long minutes = Duration.between(createdAt, now).toMinutes();
        if (minutes < 15) return "just_now";
        if (minutes < 60) return "within_the_hour";
        if (minutes < 180) return "a_few_hours_ago";
        return "earlier_today";
    }

    private int clampDelay(Integer requested) {
        if (requested == null || requested < 0) return 0;
        return Math.min(requested, maxDelayMinutes);
    }

    private boolean interactionBlocked(UUID a, UUID b) {
        return blockRepository.existsByBlockerIdAndBlockedId(a, b)
                || blockRepository.existsByBlockerIdAndBlockedId(b, a);
    }

    private void requireActiveConsent(UUID userId, ConsentPurpose purpose, String message) {
        boolean active = consentRepository.findByUserIdAndPurpose(userId, purpose)
                .map(CommunityConsent::isActive).orElse(false);
        if (!active) {
            throw new BusinessException(message);
        }
    }

    private LocationMoment requireOwnMoment(String subject, UUID momentId) {
        UUID uid = userId(subject);
        LocationMoment moment = requireMoment(momentId);
        if (!moment.getAuthorId().equals(uid)) {
            throw new BusinessException("Only the author can change this Moment.");
        }
        return moment;
    }

    private LocationMoment requireMoment(UUID momentId) {
        return momentRepository.findById(momentId)
                .orElseThrow(() -> new ResourceNotFoundException("LocationMoment", momentId));
    }

    private CommunityPlace requirePlace(UUID placeId) {
        return placeRepository.findById(placeId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPlace", placeId));
    }

    private UUID userId(String subject) {
        return userService.findByAuth0Subject(subject).getId();
    }

    private static String keySuffix(UUID actorId) {
        return actorId.toString();
    }
}
