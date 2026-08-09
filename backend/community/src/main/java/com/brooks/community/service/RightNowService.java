package com.brooks.community.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.community.domain.*;
import com.brooks.community.dto.*;
import com.brooks.community.repository.*;
import com.brooks.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * BOR-86 "Right Now" — the community live-location subsystem. Every guard here traces back to a
 * RedTeam finding recorded in BOR86_RIGHT_NOW_DESIGN.md §8. The core promise: this service can
 * answer "what is this public place like right now" but never "where is this person right now".
 */
@Service
@Transactional
@RequiredArgsConstructor
public class RightNowService {

    private final CommunityPlaceRepository placeRepository;
    private final RightNowRequestRepository requestRepository;
    private final RightNowRequestParticipantRepository participantRepository;
    private final RightNowReportRepository reportRepository;
    private final RightNowHelpfulVoteRepository voteRepository;
    private final RightNowReportFlagRepository flagRepository;
    private final CommunityBlockRepository blockRepository;
    private final CommunityConsentRepository consentRepository;
    private final ContributorTrustRepository trustRepository;
    private final CommunityModerationActionRepository moderationRepository;
    private final UserService userService;

    @Value("${app.community.k-show:3}")
    private int kShow;
    @Value("${app.community.k-count:3}")
    private int kCount;
    @Value("${app.community.k-public:5}")
    private int kPublic;
    @Value("${app.community.request-window-minutes:60}")
    private int requestWindowMinutes;
    @Value("${app.community.report-ttl-minutes:45}")
    private int reportTtlMinutes;
    @Value("${app.community.closed-report-ttl-minutes:20}")
    private int closedReportTtlMinutes;
    @Value("${app.community.dwell-seconds:120}")
    private int dwellSeconds;
    @Value("${app.community.max-radius-meters:200}")
    private int maxRadiusMeters;
    @Value("${app.community.closed-corroboration:2}")
    private int closedCorroboration;
    @Value("${app.community.trusted-threshold:25}")
    private int trustedThreshold;
    @Value("${app.community.report-rate-per-hour:3}")
    private int reportRatePerHour;
    @Value("${app.community.vote-rate-per-hour:60}")
    private int voteRatePerHour;
    @Value("${app.community.flag-autohide-threshold:3}")
    private int flagAutohideThreshold;

    // ---- Reads ------------------------------------------------------------------------------

    /** Active, v1-eligible public places inside a map viewport. */
    @Transactional(readOnly = true)
    public List<CommunityPlaceResponse> listPlaces(String subject, double north, double south,
                                                   double east, double west) {
        userService.findByAuth0Subject(subject); // require a real user
        return placeRepository.findActiveInViewport(north, south, east, west).stream()
                .filter(CommunityPlace::eligibleForV1)
                .map(p -> new CommunityPlaceResponse(p.getId(), p.getName(), p.getCategory(),
                        p.getLatitude(), p.getLongitude(), p.getFootfallClass().name()))
                .collect(Collectors.toList());
    }

    /** Current Right Now state for a place — k-gated, block-filtered, expiry-filtered. */
    @Transactional(readOnly = true)
    public RightNowFeedResponse getRightNow(String subject, UUID placeId) {
        UUID viewerId = userId(subject);
        CommunityPlace place = requirePlace(placeId);
        Instant now = Instant.now();

        Set<UUID> blocked = Set.copyOf(blockRepository.findBlockedIdsByBlocker(viewerId));
        List<RightNowReport> live = reportRepository
                .findByPlaceIdAndExpiresAtAfterAndHiddenAtIsNullAndDeletedAtIsNullOrderByCorroborationCountDescCreatedAtDesc(
                        placeId, now)
                .stream()
                .filter(r -> !blocked.contains(r.getAuthorId()))
                .collect(Collectors.toList());

        String demand = demandBucket(placeId, now);

        List<UUID> authors = live.stream().map(RightNowReport::getAuthorId).distinct().collect(Collectors.toList());
        if (authors.size() < kShow) {
            // k-anonymity: never surface a presence signal that a lone responder could produce.
            return new RightNowFeedResponse(placeId, place.getName(), demand, true, List.of());
        }

        // Feed-invariant values computed once, not per report.
        long closedDistinct = reportRepository.countDistinctLiveAuthorsByStatus(placeId, RightNowStatus.CLOSED, now);
        Map<UUID, TrustTier> trustByAuthor = trustRepository.findByUserIdIn(authors).stream()
                .collect(Collectors.toMap(ContributorTrust::getUserId, ContributorTrust::getTier, (a, b) -> a));

        List<RightNowReportView> views = live.stream()
                .map(r -> toView(r, now, closedDistinct, trustByAuthor))
                .collect(Collectors.toList());
        return new RightNowFeedResponse(placeId, place.getName(), demand, false, views);
    }

    // ---- Asking -----------------------------------------------------------------------------

    /** Join or open the current asking window for a place. Sends no location. */
    public AskResponse ask(String subject, UUID placeId) {
        UUID askerId = userId(subject);
        requireEligiblePlace(placeId);
        Instant now = Instant.now();

        RightNowRequest request = requestRepository
                .findFirstByPlaceIdAndExpiresAtAfterOrderByExpiresAtDesc(placeId, now)
                .orElseGet(() -> requestRepository.save(
                        new RightNowRequest(placeId, now.plus(requestWindowMinutes, ChronoUnit.MINUTES))));

        if (!participantRepository.existsByRequestIdAndAskerId(request.getId(), askerId)) {
            participantRepository.save(new RightNowRequestParticipant(request.getId(), askerId));
        }

        long askers = participantRepository.countByRequestId(request.getId());
        long minutesLeft = Math.max(0, Duration.between(now, request.getExpiresAt()).toMinutes());
        return new AskResponse(placeId, bucketForCount(askers), minutesLeft);
    }

    // ---- Answering --------------------------------------------------------------------------

    /**
     * Submit a structured answer. The eligibility coordinates are used here and DISCARDED — only
     * the boolean outcomes gate the write; nothing about them is persisted. Requires location
     * consent, real presence, attestation, and dwell.
     */
    public ReportCreatedResponse submitReport(String subject, UUID placeId, RightNowSubmitRequest req) {
        UUID authorId = userId(subject);
        CommunityPlace place = requireEligiblePlace(placeId);
        requireActiveConsent(authorId, ConsentPurpose.LOCATION_ELIGIBILITY,
                "Location consent is required to answer.");
        Instant now = Instant.now();

        int radius = Math.min(place.getRadiusMeters(), maxRadiusMeters);
        boolean inRadius = GeoProximity.within(place.getLatitude(), place.getLongitude(),
                req.latitude(), req.longitude(), req.accuracyMeters(), radius);
        boolean attested = req.attestationToken() != null && !req.attestationToken().isBlank();
        boolean dwellOk = req.dwellSeconds() != null && req.dwellSeconds() >= dwellSeconds;
        // req.latitude()/longitude()/accuracy go out of scope here and are never stored/logged.

        if (!(inRadius && attested && dwellOk)) {
            throw new BusinessException(
                    "You can only answer if you are at this place, verified, and have stayed a moment.");
        }

        Instant hourAgo = now.minus(1, ChronoUnit.HOURS);
        if (reportRepository.countByAuthorIdAndPlaceIdAndCreatedAtAfter(authorId, placeId, hourAgo)
                >= reportRatePerHour) {
            throw new BusinessException("You've answered this place a few times recently — try again later.");
        }

        RightNowReport report = new RightNowReport();
        report.setPlaceId(placeId);
        report.setAuthorId(authorId);
        report.setStatus(req.status());
        report.setWaitBucket(blankToNull(req.waitBucket()));
        int ttl = req.status() == RightNowStatus.CLOSED ? closedReportTtlMinutes : reportTtlMinutes;
        report.setExpiresAt(now.plus(ttl, ChronoUnit.MINUTES));
        report = reportRepository.save(report);

        // Snapshot same-status agreement for feed ordering (counts this now-live report). One query.
        long sameStatusDistinct = reportRepository
                .countDistinctLiveAuthorsByStatus(placeId, req.status(), now);
        report.setCorroborationCount((int) sameStatusDistinct);
        reportRepository.save(report);

        String effective = req.status() == RightNowStatus.CLOSED && sameStatusDistinct < closedCorroboration
                ? "CLOSED_UNCONFIRMED" : req.status().name();
        return new ReportCreatedResponse(report.getId(), effective,
                Math.max(0, Duration.between(now, report.getExpiresAt()).toMinutes()));
    }

    // ---- Trust & safety ---------------------------------------------------------------------

    public void voteHelpful(String subject, UUID reportId) {
        UUID voterId = userId(subject);
        RightNowReport report = requireReport(reportId);

        if (report.getAuthorId().equals(voterId)) {
            throw new BusinessException("You can't mark your own report helpful.");
        }
        if (interactionBlocked(voterId, report.getAuthorId())) {
            throw new BusinessException("This interaction isn't available.");
        }
        if (voteRepository.existsByReportIdAndVoterId(reportId, voterId)) {
            return; // idempotent
        }
        Instant hourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        if (voteRepository.countByVoterIdAndCreatedAtAfter(voterId, hourAgo) >= voteRatePerHour) {
            throw new BusinessException("You're voting too quickly — try again later.");
        }

        voteRepository.save(new RightNowHelpfulVote(reportId, voterId));
        bumpTrust(report.getAuthorId());
    }

    public void flagReport(String subject, UUID reportId, RightNowFlagRequest req) {
        UUID reporterId = userId(subject);
        RightNowReport report = requireReport(reportId);
        if (flagRepository.existsByReportIdAndReporterId(reportId, reporterId)) {
            return; // one flag per reporter
        }
        flagRepository.save(new RightNowReportFlag(reportId, reporterId, req.category()));

        if (req.category().critical()) {
            autoHide(report, "flag:" + req.category());
        } else if (flagRepository.countByReportIdAndCategoryIn(reportId, FlagCategory.nonCritical())
                >= flagAutohideThreshold) {
            autoHide(report, "flag-threshold");
        }
    }

    public void block(String subject, UUID blockedUserId) {
        UUID blockerId = userId(subject);
        if (blockerId.equals(blockedUserId)) {
            throw new BusinessException("You can't block yourself.");
        }
        userService.findById(blockedUserId); // 404 if not a real user
        if (!blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedUserId)) {
            blockRepository.save(new CommunityBlock(blockerId, blockedUserId));
        }
    }

    public void unblock(String subject, UUID blockedUserId) {
        blockRepository.deleteByBlockerIdAndBlockedId(userId(subject), blockedUserId);
    }

    // ---- Public card & consent --------------------------------------------------------------

    public void sharePublic(String subject, UUID reportId) {
        UUID authorId = userId(subject);
        RightNowReport report = requireReport(reportId);
        if (!report.getAuthorId().equals(authorId)) {
            throw new BusinessException("Only the author can share their report.");
        }
        CommunityPlace place = requirePlace(report.getPlaceId());
        if (!place.isPublicCardAllowed() || place.getFootfallClass() != FootfallClass.HIGH) {
            throw new BusinessException("This place can't have a public card.");
        }
        requireActiveConsent(authorId, ConsentPurpose.PUBLIC_CARD,
                "Public-card consent is required to share publicly.");
        Instant now = Instant.now();
        if (reportRepository.countDistinctLiveAuthors(report.getPlaceId(), now) < kPublic) {
            throw new BusinessException("Not enough recent activity here for a public card yet.");
        }
        report.setSharedPublic(true);
        report.setPublicSharedAt(now);
        report.setPublicRevokedAt(null);
        reportRepository.save(report);
    }

    public void grantConsent(String subject, ConsentPurpose purpose) {
        UUID uid = userId(subject);
        CommunityConsent consent = consentRepository.findByUserIdAndPurpose(uid, purpose)
                .orElseGet(() -> new CommunityConsent(uid, purpose));
        consent.setGrantedAt(Instant.now());
        consent.setWithdrawnAt(null);
        consentRepository.save(consent);
    }

    public void withdrawConsent(String subject, ConsentPurpose purpose) {
        consentRepository.findByUserIdAndPurpose(userId(subject), purpose).ifPresent(c -> {
            c.setWithdrawnAt(Instant.now());
            consentRepository.save(c);
        });
    }

    // ---- Helpers ----------------------------------------------------------------------------

    private RightNowReportView toView(RightNowReport r, Instant now, long closedDistinct,
                                      Map<UUID, TrustTier> trustByAuthor) {
        boolean closed = r.getStatus() == RightNowStatus.CLOSED;
        boolean corroborated = !closed || closedDistinct >= closedCorroboration;
        String effective = (closed && !corroborated) ? "CLOSED_UNCONFIRMED" : r.getStatus().name();
        String tier = trustByAuthor.get(r.getAuthorId()) == TrustTier.TRUSTED ? TrustTier.TRUSTED.name() : null;
        return new RightNowReportView(r.getId(), effective, r.getWaitBucket(),
                freshness(r.getCreatedAt(), now), tier, corroborated, r.isPublicCardLive(now));
    }

    /** Coarse relative freshness key (never an exact timestamp — prevents arrival-time correlation). */
    private String freshness(Instant createdAt, Instant now) {
        long minutes = Duration.between(createdAt, now).toMinutes();
        if (minutes < 15) return "under_15_min";
        if (minutes < 45) return "about_30_min";
        if (minutes < 90) return "about_1_hour";
        return "over_1_hour";
    }

    /** Demand shown bucketed and only at/above K_count distinct askers (never an exact number). */
    private String demandBucket(UUID placeId, Instant now) {
        long askers = requestRepository
                .findFirstByPlaceIdAndExpiresAtAfterOrderByExpiresAtDesc(placeId, now)
                .map(req -> participantRepository.countByRequestId(req.getId()))
                .orElse(0L);
        return bucketForCount(askers);
    }

    private String bucketForCount(long askers) {
        if (askers < kCount) return null;
        if (askers <= 5) return "few";
        if (askers <= 10) return "several";
        return "many";
    }

    private void bumpTrust(UUID authorId) {
        ContributorTrust trust = trustRepository.findByUserId(authorId)
                .orElseGet(() -> new ContributorTrust(authorId));
        trust.setHelpfulWeighted(trust.getHelpfulWeighted() + 1.0);
        if (trust.getHelpfulWeighted() >= trustedThreshold) {
            trust.setTier(TrustTier.TRUSTED);
        }
        trust.setRecomputedAt(Instant.now());
        trustRepository.save(trust);
    }

    private void autoHide(RightNowReport report, String reason) {
        report.setHiddenAt(Instant.now());
        report.setRemovedReason(reason);
        reportRepository.save(report);
        moderationRepository.save(
                new CommunityModerationAction(null, report.getId(), "AUTO_HIDE", reason));
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

    private CommunityPlace requirePlace(UUID placeId) {
        return placeRepository.findById(placeId)
                .orElseThrow(() -> new ResourceNotFoundException("CommunityPlace", placeId));
    }

    private CommunityPlace requireEligiblePlace(UUID placeId) {
        CommunityPlace place = requirePlace(placeId);
        if (!place.eligibleForV1()) {
            throw new BusinessException("This place isn't available for Right Now.");
        }
        return place;
    }

    private RightNowReport requireReport(UUID reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("RightNowReport", reportId));
    }

    private UUID userId(String subject) {
        return userService.findByAuth0Subject(subject).getId();
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
