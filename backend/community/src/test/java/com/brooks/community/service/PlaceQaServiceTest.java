package com.brooks.community.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.community.domain.*;
import com.brooks.community.dto.AnswerRequest;
import com.brooks.community.dto.AskQuestionRequest;
import com.brooks.community.dto.QuestionCreatedResponse;
import com.brooks.community.dto.QuestionView;
import com.brooks.community.repository.*;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class PlaceQaServiceTest {

    private PlaceQuestionRepository questionRepository;
    private PlaceAnswerRepository answerRepository;
    private PlaceAnswerHelpfulVoteRepository voteRepository;
    private PlaceAnswerFlagRepository flagRepository;
    private CommunityPlaceRepository placeRepository;
    private CommunityBlockRepository blockRepository;
    private CommunityConsentRepository consentRepository;
    private ContributorTrustRepository trustRepository;
    private CommunityModerationActionRepository moderationRepository;
    private ValueEventRepository valueEventRepository;
    private UserService userService;
    private PlaceQaService service;

    @BeforeEach
    void setUp() {
        questionRepository = mock(PlaceQuestionRepository.class);
        answerRepository = mock(PlaceAnswerRepository.class);
        voteRepository = mock(PlaceAnswerHelpfulVoteRepository.class);
        flagRepository = mock(PlaceAnswerFlagRepository.class);
        placeRepository = mock(CommunityPlaceRepository.class);
        blockRepository = mock(CommunityBlockRepository.class);
        consentRepository = mock(CommunityConsentRepository.class);
        trustRepository = mock(ContributorTrustRepository.class);
        moderationRepository = mock(CommunityModerationActionRepository.class);
        valueEventRepository = mock(ValueEventRepository.class);
        userService = mock(UserService.class);
        service = new PlaceQaService(questionRepository, answerRepository, voteRepository, flagRepository,
                placeRepository, blockRepository, consentRepository, trustRepository, moderationRepository,
                valueEventRepository, new CaptionModerator(), userService);
        ReflectionTestUtils.setField(service, "questionTtlHours", 6);
        ReflectionTestUtils.setField(service, "answerTtlMinutes", 180);
        ReflectionTestUtils.setField(service, "kShow", 2);
        ReflectionTestUtils.setField(service, "maxRadiusMeters", 200);
        ReflectionTestUtils.setField(service, "dwellSeconds", 120);
        ReflectionTestUtils.setField(service, "answerRatePerHour", 5);
        ReflectionTestUtils.setField(service, "voteRatePerHour", 60);
        ReflectionTestUtils.setField(service, "corroborationThreshold", 2);
        ReflectionTestUtils.setField(service, "trustedThreshold", 25);
        ReflectionTestUtils.setField(service, "flagAutohideThreshold", 3);
    }

    private UUID mockUser() {
        UUID id = UUID.randomUUID();
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(userService.findByAuth0Subject(anyString())).thenReturn(user);
        return id;
    }

    private CommunityPlace eligiblePlace(UUID id) {
        CommunityPlace p = new CommunityPlace();
        ReflectionTestUtils.setField(p, "id", id);
        p.setName("Fabrika");
        p.setCategory("cafe");
        p.setLatitude(41.7043);
        p.setLongitude(44.8015);
        p.setRadiusMeters(150);
        p.setActive(true);
        return p;
    }

    private PlaceQuestion liveQuestion(UUID id, UUID placeId) {
        PlaceQuestion q = new PlaceQuestion();
        ReflectionTestUtils.setField(q, "id", id);
        ReflectionTestUtils.setField(q, "createdAt", Instant.now()); // set on persist in prod
        q.setPlaceId(placeId);
        q.setAskerId(UUID.randomUUID());
        q.setPresetKey("CROWDED");
        q.setExpiresAt(Instant.now().plusSeconds(3600));
        return q;
    }

    @Test
    void askRejectedWhenNothingProvided() {
        mockUser();
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(eligiblePlace(placeId)));

        assertThatThrownBy(() -> service.ask("sub", placeId, new AskQuestionRequest(null, null)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void askRejectsPersonTargetingFreeText() {
        mockUser();
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(eligiblePlace(placeId)));

        assertThatThrownBy(() -> service.ask("sub", placeId, new AskQuestionRequest(null, "is @john here?")))
                .isInstanceOf(BusinessException.class);
        verify(questionRepository, never()).save(any());
    }

    @Test
    void askSucceedsWithPreset() {
        mockUser();
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(eligiblePlace(placeId)));
        when(questionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        QuestionCreatedResponse res = service.ask("sub", placeId, new AskQuestionRequest("CROWDED", null));

        assertThat(res).isNotNull();
        assertThat(res.expiresInMinutes()).isBetween(350L, 360L); // ~6h
        verify(questionRepository).save(any(PlaceQuestion.class));
    }

    @Test
    void answerRejectedWhenQuestionExpired() {
        mockUser();
        UUID qid = UUID.randomUUID();
        PlaceQuestion expired = liveQuestion(qid, UUID.randomUUID());
        expired.setExpiresAt(Instant.now().minusSeconds(60));
        when(questionRepository.findById(qid)).thenReturn(Optional.of(expired));

        AnswerRequest req = new AnswerRequest("busy", null, 41.7043, 44.8015, 5.0, "attest", 200);
        assertThatThrownBy(() -> service.answer("sub", qid, req)).isInstanceOf(BusinessException.class);
    }

    @Test
    void answerRejectedWithoutAttestation() {
        UUID uid = mockUser();
        UUID placeId = UUID.randomUUID();
        UUID qid = UUID.randomUUID();
        when(questionRepository.findById(qid)).thenReturn(Optional.of(liveQuestion(qid, placeId)));
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(eligiblePlace(placeId)));
        CommunityConsent consent = new CommunityConsent(uid, ConsentPurpose.LOCATION_ELIGIBILITY);
        consent.setGrantedAt(Instant.now());
        when(consentRepository.findByUserIdAndPurpose(uid, ConsentPurpose.LOCATION_ELIGIBILITY))
                .thenReturn(Optional.of(consent));

        AnswerRequest req = new AnswerRequest("busy", null, 41.7043, 44.8015, 5.0, "  ", 200);
        assertThatThrownBy(() -> service.answer("sub", qid, req)).isInstanceOf(BusinessException.class);
    }

    @Test
    void cannotVoteOwnAnswer() {
        UUID uid = mockUser();
        UUID answerId = UUID.randomUUID();
        PlaceAnswer own = new PlaceAnswer();
        own.setResponderId(uid);
        when(answerRepository.findById(answerId)).thenReturn(Optional.of(own));

        assertThatThrownBy(() -> service.voteHelpful("sub", answerId)).isInstanceOf(BusinessException.class);
        verify(valueEventRepository, never()).save(any());
    }

    @Test
    void answersSuppressedBelowKAnonymity() {
        mockUser();
        UUID placeId = UUID.randomUUID();
        UUID qid = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(eligiblePlace(placeId)));
        when(blockRepository.findBlockedIdsByBlocker(any())).thenReturn(List.of());
        when(questionRepository.findByPlaceIdAndExpiresAtAfterOrderByCreatedAtDesc(eq(placeId), any()))
                .thenReturn(List.of(liveQuestion(qid, placeId)));
        when(answerRepository.countDistinctLiveResponders(eq(qid), any())).thenReturn(1L); // < kShow(2)

        List<QuestionView> out = service.listQuestions("sub", placeId);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).suppressedForAnonymity()).isTrue();
        assertThat(out.get(0).answers()).isEmpty();
        verify(answerRepository, never())
                .findByQuestionIdAndExpiresAtAfterAndHiddenAtIsNullAndDeletedAtIsNullOrderByCorroborationCountDescCreatedAtDesc(
                        any(), any());
    }
}
