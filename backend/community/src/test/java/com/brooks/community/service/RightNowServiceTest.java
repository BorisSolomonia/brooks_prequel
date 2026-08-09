package com.brooks.community.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.community.domain.CommunityPlace;
import com.brooks.community.domain.RightNowReport;
import com.brooks.community.domain.RightNowStatus;
import com.brooks.community.dto.RightNowFeedResponse;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RightNowServiceTest {

    private CommunityPlaceRepository placeRepository;
    private RightNowRequestRepository requestRepository;
    private RightNowRequestParticipantRepository participantRepository;
    private RightNowReportRepository reportRepository;
    private RightNowHelpfulVoteRepository voteRepository;
    private RightNowReportFlagRepository flagRepository;
    private CommunityBlockRepository blockRepository;
    private CommunityConsentRepository consentRepository;
    private ContributorTrustRepository trustRepository;
    private CommunityModerationActionRepository moderationRepository;
    private UserService userService;
    private RightNowService service;

    @BeforeEach
    void setUp() {
        placeRepository = mock(CommunityPlaceRepository.class);
        requestRepository = mock(RightNowRequestRepository.class);
        participantRepository = mock(RightNowRequestParticipantRepository.class);
        reportRepository = mock(RightNowReportRepository.class);
        voteRepository = mock(RightNowHelpfulVoteRepository.class);
        flagRepository = mock(RightNowReportFlagRepository.class);
        blockRepository = mock(CommunityBlockRepository.class);
        consentRepository = mock(CommunityConsentRepository.class);
        trustRepository = mock(ContributorTrustRepository.class);
        moderationRepository = mock(CommunityModerationActionRepository.class);
        userService = mock(UserService.class);
        service = new RightNowService(placeRepository, requestRepository, participantRepository,
                reportRepository, voteRepository, flagRepository, blockRepository, consentRepository,
                trustRepository, moderationRepository, userService);
        ReflectionTestUtils.setField(service, "kShow", 3);
        ReflectionTestUtils.setField(service, "kCount", 3);
        ReflectionTestUtils.setField(service, "closedCorroboration", 2);
    }

    private void mockUser(UUID id) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(userService.findByAuth0Subject(anyString())).thenReturn(user);
    }

    @Test
    void cannotVoteHelpfulOnOwnReport() {
        UUID me = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();
        mockUser(me);
        RightNowReport own = new RightNowReport();
        own.setAuthorId(me);
        when(reportRepository.findById(reportId)).thenReturn(Optional.of(own));

        assertThatThrownBy(() -> service.voteHelpful("sub", reportId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("own report");
    }

    @Test
    void rightNowSuppressedBelowKShow() {
        UUID viewer = UUID.randomUUID();
        UUID placeId = UUID.randomUUID();
        mockUser(viewer);

        CommunityPlace place = new CommunityPlace();
        place.setName("Café");
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(place));
        when(blockRepository.findBlockedIdsByBlocker(viewer)).thenReturn(List.of());
        when(requestRepository.findFirstByPlaceIdAndExpiresAtAfterOrderByExpiresAtDesc(eq(placeId), any()))
                .thenReturn(Optional.empty());

        // Only ONE distinct responder — below K_show=3, so the signal is withheld.
        RightNowReport lone = new RightNowReport();
        lone.setPlaceId(placeId);
        lone.setAuthorId(UUID.randomUUID());
        lone.setStatus(RightNowStatus.NORMAL);
        when(reportRepository
                .findByPlaceIdAndExpiresAtAfterAndHiddenAtIsNullAndDeletedAtIsNullOrderByCorroborationCountDescCreatedAtDesc(
                        eq(placeId), any()))
                .thenReturn(List.of(lone));

        RightNowFeedResponse feed = service.getRightNow("sub", placeId);

        assertThat(feed.suppressedForAnonymity()).isTrue();
        assertThat(feed.reports()).isEmpty();
    }
}
