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
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Right Now v2 · Phase A2 — free-text + preset Place Q&A (RIGHT_NOW_V2_DESIGN.md §4).
 * Asking is REMOTE-allowed (D-2, no presence); answering is present-only (§9.2) and ANONYMOUS
 * (D-4). Free-text question bodies are person-targeting-guarded (§9.1) via {@link CaptionModerator}.
 * Answers are k-anonymity-suppressed below a threshold to defeat the low-traffic intersection
 * de-anonymisation. Helpful votes record ANSWER_HELPFUL into the dormant value ledger (D-6).
 */
@Service
@Transactional
@RequiredArgsConstructor
public class PlaceQaService {

    private final PlaceQuestionRepository questionRepository;
    private final PlaceAnswerRepository answerRepository;
    private final PlaceAnswerHelpfulVoteRepository voteRepository;
    private final PlaceAnswerFlagRepository flagRepository;
    private final CommunityPlaceRepository placeRepository;
    private final CommunityBlockRepository blockRepository;
    private final CommunityConsentRepository consentRepository;
    private final ContributorTrustRepository trustRepository;
    private final CommunityModerationActionRepository moderationRepository;
    private final ValueEventRepository valueEventRepository;
    private final CaptionModerator captionModerator;
    private final UserService userService;

    @Value("${app.community.qa-question-ttl-hours:6}")
    private int questionTtlHours;
    @Value("${app.community.qa-answer-ttl-minutes:180}")
    private int answerTtlMinutes;
    @Value("${app.community.qa-k-show:2}")
    private int kShow;
    @Value("${app.community.max-radius-meters:200}")
    private int maxRadiusMeters;
    @Value("${app.community.dwell-seconds:120}")
    private int dwellSeconds;
    @Value("${app.community.qa-answer-rate-per-hour:5}")
    private int answerRatePerHour;
    @Value("${app.community.vote-rate-per-hour:60}")
    private int voteRatePerHour;
    @Value("${app.community.closed-corroboration:2}")
    private int corroborationThreshold;
    @Value("${app.community.trusted-threshold:25}")
    private int trustedThreshold;
    @Value("${app.community.flag-autohide-threshold:3}")
    private int flagAutohideThreshold;

    // ---- Asking (remote-allowed, no presence) ------------------------------------------------

    public QuestionCreatedResponse ask(String subject, UUID placeId, AskQuestionRequest req) {
        UUID askerId = userId(subject);
        requireEligiblePlace(placeId);

        String body = blankToNull(req.bodyText());
        String preset = blankToNull(req.presetKey());
        if (body == null && preset == null) {
            throw new BusinessException("Ask a question or pick one of the quick options.");
        }
        // Person-targeting guard on free text (§9.1): blocks @handles/phones/emails.
        String moderatedBody = body == null ? null : captionModerator.moderate(body);

        Instant now = Instant.now();
        PlaceQuestion question = new PlaceQuestion();
        question.setPlaceId(placeId);
        question.setAskerId(askerId);
        question.setBodyText(moderatedBody);
        question.setPresetKey(preset);
        question.setFreeText(moderatedBody != null);
        question.setExpiresAt(now.plus(questionTtlHours, ChronoUnit.HOURS));
        question = questionRepository.save(question);

        return new QuestionCreatedResponse(question.getId(),
                Math.max(0, Duration.between(now, question.getExpiresAt()).toMinutes()));
    }

    // ---- Reading (anonymous, k-gated, block-filtered) ---------------------------------------

    @Transactional(readOnly = true)
    public List<QuestionView> listQuestions(String subject, UUID placeId) {
        UUID viewerId = userId(subject);
        requirePlace(placeId);
        Instant now = Instant.now();
        Set<UUID> blocked = Set.copyOf(blockRepository.findBlockedIdsByBlocker(viewerId));

        return questionRepository.findByPlaceIdAndExpiresAtAfterOrderByCreatedAtDesc(placeId, now).stream()
                .map(q -> toQuestionView(q, now, blocked))
                .collect(Collectors.toList());
    }

    // ---- Answering (present-only, anonymous) ------------------------------------------------

    public AnswerCreatedResponse answer(String subject, UUID questionId, AnswerRequest req) {
        UUID responderId = userId(subject);
        PlaceQuestion question = requireQuestion(questionId);
        Instant now = Instant.now();
        if (!question.isLive(now)) {
            throw new BusinessException("This question is no longer open.");
        }
        CommunityPlace place = requireEligiblePlace(question.getPlaceId());
        requireActiveConsent(responderId, ConsentPurpose.LOCATION_ELIGIBILITY,
                "Location consent is required to answer.");

        int radius = Math.min(place.getRadiusMeters(), maxRadiusMeters);
        boolean inRadius = GeoProximity.within(place.getLatitude(), place.getLongitude(),
                req.latitude(), req.longitude(), req.accuracyMeters(), radius);
        boolean attested = req.attestationToken() != null && !req.attestationToken().isBlank();
        boolean dwellOk = req.dwellSeconds() != null && req.dwellSeconds() >= dwellSeconds;
        // Coordinates go out of scope here — never persisted or logged.
        if (!(inRadius && attested && dwellOk)) {
            throw new BusinessException(
                    "You can only answer if you are at this place, verified, and have stayed a moment.");
        }

        String body = blankToNull(req.bodyText());
        String chip = blankToNull(req.statusChip());
        if (body == null && chip == null) {
            throw new BusinessException("Add a short answer or pick a quick status.");
        }
        String moderatedBody = body == null ? null : captionModerator.moderate(body);

        Instant hourAgo = now.minus(1, ChronoUnit.HOURS);
        if (answerRepository.countByResponderIdAndCreatedAtAfter(responderId, hourAgo) >= answerRatePerHour) {
            throw new BusinessException("You've answered a lot recently — try again later.");
        }

        PlaceAnswer answer = new PlaceAnswer();
        answer.setQuestionId(questionId);
        answer.setResponderId(responderId);
        answer.setBodyText(moderatedBody);
        answer.setStatusChip(chip);
        answer.setExpiresAt(now.plus(answerTtlMinutes, ChronoUnit.MINUTES));
        answer = answerRepository.save(answer);

        long distinct = answerRepository.countDistinctLiveResponders(questionId, now);
        answer.setCorroborationCount((int) distinct);
        answerRepository.save(answer);

        if (question.getStatus() == QuestionStatus.OPEN) {
            question.setStatus(QuestionStatus.ANSWERED);
            questionRepository.save(question);
        }
        return new AnswerCreatedResponse(answer.getId(),
                Math.max(0, Duration.between(now, answer.getExpiresAt()).toMinutes()));
    }

    // ---- Trust & safety ---------------------------------------------------------------------

    public void voteHelpful(String subject, UUID answerId) {
        UUID voterId = userId(subject);
        PlaceAnswer answer = requireAnswer(answerId);
        if (answer.getResponderId().equals(voterId)) {
            throw new BusinessException("You can't mark your own answer helpful.");
        }
        if (interactionBlocked(voterId, answer.getResponderId())) {
            throw new BusinessException("This interaction isn't available.");
        }
        if (voteRepository.existsByAnswerIdAndVoterId(answerId, voterId)) {
            return; // idempotent
        }
        Instant hourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        if (voteRepository.countByVoterIdAndCreatedAtAfter(voterId, hourAgo) >= voteRatePerHour) {
            throw new BusinessException("You're voting too quickly — try again later.");
        }

        voteRepository.save(new PlaceAnswerHelpfulVote(answerId, voterId));
        answer.setHelpfulCount(answer.getHelpfulCount() + 1);
        answerRepository.save(answer);
        bumpTrust(answer.getResponderId());
        recordAnswerHelpful(answer, voterId);
    }

    public void flagAnswer(String subject, UUID answerId, RightNowFlagRequest req) {
        UUID reporterId = userId(subject);
        PlaceAnswer answer = requireAnswer(answerId);
        if (flagRepository.existsByAnswerIdAndReporterId(answerId, reporterId)) {
            return;
        }
        flagRepository.save(new PlaceAnswerFlag(answerId, reporterId, req.category()));

        if (req.category().critical()) {
            autoHide(answer, "flag:" + req.category());
        } else if (flagRepository.countByAnswerIdAndCategoryIn(answerId, FlagCategory.nonCritical())
                >= flagAutohideThreshold) {
            autoHide(answer, "flag-threshold");
        }
    }

    // ---- Helpers ----------------------------------------------------------------------------

    private QuestionView toQuestionView(PlaceQuestion q, Instant now, Set<UUID> blocked) {
        long distinct = answerRepository.countDistinctLiveResponders(q.getId(), now);
        if (distinct < kShow) {
            // k-anonymity: too few distinct responders to safely surface answers.
            return new QuestionView(q.getId(), q.getPlaceId(), q.getPresetKey(), q.getBodyText(),
                    q.isFreeText(), freshness(q.getCreatedAt(), now), true, List.of());
        }
        List<AnswerView> answers = answerRepository
                .findByQuestionIdAndExpiresAtAfterAndHiddenAtIsNullAndDeletedAtIsNullOrderByCorroborationCountDescCreatedAtDesc(
                        q.getId(), now)
                .stream()
                .filter(a -> !blocked.contains(a.getResponderId()))
                .map(a -> toAnswerView(a, now))
                .collect(Collectors.toList());
        return new QuestionView(q.getId(), q.getPlaceId(), q.getPresetKey(), q.getBodyText(),
                q.isFreeText(), freshness(q.getCreatedAt(), now), false, answers);
    }

    private AnswerView toAnswerView(PlaceAnswer a, Instant now) {
        boolean corroborated = a.getCorroborationCount() >= corroborationThreshold;
        String tier = trustRepository.findByUserId(a.getResponderId())
                .map(ContributorTrust::getTier)
                .filter(t -> t == TrustTier.TRUSTED)
                .map(Enum::name)
                .orElse(null);
        return new AnswerView(a.getId(), a.getBodyText(), a.getStatusChip(),
                freshness(a.getCreatedAt(), now), corroborated, tier);
    }

    private void recordAnswerHelpful(PlaceAnswer answer, UUID voterId) {
        UUID placeId = questionRepository.findById(answer.getQuestionId())
                .map(PlaceQuestion::getPlaceId).orElse(null);
        String key = "ANSWER_HELPFUL:" + answer.getId() + ":" + voterId;
        if (valueEventRepository.existsByIdempotencyKey(key)) {
            return;
        }
        ValueEvent event = new ValueEvent();
        event.setEventType(ValueEventType.ANSWER_HELPFUL);
        event.setSubjectUserId(answer.getResponderId());
        event.setActorUserId(voterId);
        event.setSourceRef(answer.getId());
        event.setPlaceId(placeId);
        event.setPlaceTrafficTier(placeId == null ? null : placeRepository.findById(placeId)
                .map(p -> p.getFootfallClass().name()).orElse(null));
        event.setEpochId(LocalDate.ofInstant(Instant.now(), ZoneOffset.UTC).toString());
        event.setIdempotencyKey(key);
        valueEventRepository.save(event);
    }

    private void bumpTrust(UUID responderId) {
        ContributorTrust trust = trustRepository.findByUserId(responderId)
                .orElseGet(() -> new ContributorTrust(responderId));
        trust.setHelpfulWeighted(trust.getHelpfulWeighted() + 1.0);
        if (trust.getHelpfulWeighted() >= trustedThreshold) {
            trust.setTier(TrustTier.TRUSTED);
        }
        trust.setRecomputedAt(Instant.now());
        trustRepository.save(trust);
    }

    private void autoHide(PlaceAnswer answer, String reason) {
        answer.setHiddenAt(Instant.now());
        answer.setRemovedReason(reason);
        answerRepository.save(answer);
        moderationRepository.save(new CommunityModerationAction(null, null, "AUTO_HIDE_ANSWER", reason));
    }

    private String freshness(Instant createdAt, Instant now) {
        long minutes = Duration.between(createdAt, now).toMinutes();
        if (minutes < 15) return "under_15_min";
        if (minutes < 45) return "about_30_min";
        if (minutes < 90) return "about_1_hour";
        return "over_1_hour";
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

    private PlaceQuestion requireQuestion(UUID id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PlaceQuestion", id));
    }

    private PlaceAnswer requireAnswer(UUID id) {
        return answerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PlaceAnswer", id));
    }

    private UUID userId(String subject) {
        return userService.findByAuth0Subject(subject).getId();
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
