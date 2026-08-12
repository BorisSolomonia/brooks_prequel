package com.brooks.community.service;

import com.brooks.common.exception.BusinessException;
import com.brooks.community.domain.*;
import com.brooks.community.dto.MomentCreatedResponse;
import com.brooks.community.dto.MomentFeedResponse;
import com.brooks.community.dto.MomentSubmitRequest;
import com.brooks.community.repository.*;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class MomentServiceTest {

    private LocationMomentRepository momentRepository;
    private LocationMomentViewRepository viewRepository;
    private ValueEventRepository valueEventRepository;
    private MomentAudienceRepository audienceRepository;
    private CommunityPlaceRepository placeRepository;
    private CommunityBlockRepository blockRepository;
    private CommunityConsentRepository consentRepository;
    private FollowGraphReader followGraph;
    private UserService userService;
    private UserProfileRepository profileRepository;
    private MomentService service;

    @BeforeEach
    void setUp() {
        momentRepository = mock(LocationMomentRepository.class);
        viewRepository = mock(LocationMomentViewRepository.class);
        valueEventRepository = mock(ValueEventRepository.class);
        audienceRepository = mock(MomentAudienceRepository.class);
        placeRepository = mock(CommunityPlaceRepository.class);
        blockRepository = mock(CommunityBlockRepository.class);
        consentRepository = mock(CommunityConsentRepository.class);
        followGraph = mock(FollowGraphReader.class);
        userService = mock(UserService.class);
        profileRepository = mock(UserProfileRepository.class);
        service = new MomentService(momentRepository, viewRepository, valueEventRepository,
                audienceRepository, placeRepository, blockRepository, consentRepository, followGraph,
                new CaptionModerator(), userService, profileRepository);
        ReflectionTestUtils.setField(service, "momentTtlHours", 24);
        ReflectionTestUtils.setField(service, "postRatePerHour", 10);
        ReflectionTestUtils.setField(service, "maxRadiusMeters", 200);
        ReflectionTestUtils.setField(service, "dwellSeconds", 120);
        ReflectionTestUtils.setField(service, "maxDelayMinutes", 120);
    }

    private UUID mockUser() {
        UUID id = UUID.randomUUID();
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(userService.findByAuth0Subject(anyString())).thenReturn(user);
        return id;
    }

    private CommunityPlace place(UUID id, boolean storiesExcluded) {
        CommunityPlace p = new CommunityPlace();
        ReflectionTestUtils.setField(p, "id", id);
        p.setName("Fabrika");
        p.setCategory("cafe");
        p.setLatitude(41.7043);
        p.setLongitude(44.8015);
        p.setRadiusMeters(150);
        p.setActive(true);
        p.setStoriesExcluded(storiesExcluded);
        return p;
    }

    private MomentSubmitRequest presentRequest(String caption) {
        // Device coordinates == place coordinates → within radius; attested; dwell satisfied.
        return new MomentSubmitRequest("gcs://m/1.jpg", MomentMediaType.PHOTO, caption, null, 0,
                41.7043, 44.8015, 5.0, "attest-token", 200, "dev-1", "install-1", "sess-1");
    }

    private void consentActive(UUID userId) {
        CommunityConsent c = new CommunityConsent(userId, ConsentPurpose.LOCATION_ELIGIBILITY);
        c.setGrantedAt(java.time.Instant.now());
        when(consentRepository.findByUserIdAndPurpose(userId, ConsentPurpose.LOCATION_ELIGIBILITY))
                .thenReturn(Optional.of(c));
    }

    @Test
    void postSucceedsWhenPresentConsentedAndClean() {
        UUID uid = mockUser();
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(place(placeId, false)));
        consentActive(uid);
        when(momentRepository.countByAuthorIdAndCreatedAtAfter(any(), any())).thenReturn(0L);
        when(momentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MomentCreatedResponse res = service.postMoment("sub", placeId, presentRequest("nice view"));

        assertThat(res).isNotNull();
        assertThat(res.expiresInMinutes()).isBetween(1430L, 1440L); // ~24h
        verify(momentRepository).save(any(LocationMoment.class));
    }

    @Test
    void postRejectedAtSensitiveKidPlace() {
        UUID uid = mockUser();
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(place(placeId, true)));

        assertThatThrownBy(() -> service.postMoment("sub", placeId, presentRequest("hi")))
                .isInstanceOf(BusinessException.class);
        verify(momentRepository, never()).save(any());
    }

    @Test
    void postRejectedWhenNotAttested() {
        UUID uid = mockUser();
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(place(placeId, false)));
        consentActive(uid);
        MomentSubmitRequest noAttest = new MomentSubmitRequest("gcs://m/1.jpg", MomentMediaType.PHOTO,
                null, null, 0, 41.7043, 44.8015, 5.0, "  ", 200, null, null, null);

        assertThatThrownBy(() -> service.postMoment("sub", placeId, noAttest))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void captionWithHandleRejected() {
        UUID uid = mockUser();
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(place(placeId, false)));
        consentActive(uid);
        when(momentRepository.countByAuthorIdAndCreatedAtAfter(any(), any())).thenReturn(0L);

        assertThatThrownBy(() -> service.postMoment("sub", placeId, presentRequest("is @john here?")))
                .isInstanceOf(BusinessException.class);
        verify(momentRepository, never()).save(any());
    }

    @Test
    void placeMomentsEmptyWhenFollowingNobody() {
        mockUser();
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findById(placeId)).thenReturn(Optional.of(place(placeId, false)));
        when(followGraph.findFollowingIds(any())).thenReturn(List.of());

        MomentFeedResponse feed = service.listPlaceMoments("sub", placeId);

        assertThat(feed.moments()).isEmpty();
        verify(momentRepository, never())
                .findByPlaceIdAndAuthorIdInAndVisibleAtBeforeAndExpiresAtAfterAndTakenDownAtIsNullAndGoGhostFalseOrderByCreatedAtDesc(
                        any(), any(), any(), any());
    }

    @Test
    void cannotRecordViewOnOwnMoment() {
        UUID uid = mockUser();
        UUID momentId = UUID.randomUUID();
        LocationMoment own = new LocationMoment();
        own.setAuthorId(uid);
        when(momentRepository.findById(momentId)).thenReturn(Optional.of(own));

        assertThatThrownBy(() -> service.recordView("sub", momentId, 1000, "s"))
                .isInstanceOf(BusinessException.class);
        verify(valueEventRepository, never()).save(any());
    }

    @Test
    void recordViewRequiresFollowingTheAuthor() {
        UUID viewer = mockUser();
        UUID momentId = UUID.randomUUID();
        LocationMoment m = new LocationMoment();
        m.setAuthorId(UUID.randomUUID());
        m.setPlaceId(UUID.randomUUID());
        m.setExpiresAt(java.time.Instant.now().plusSeconds(3600));
        m.setVisibleAt(java.time.Instant.now().minusSeconds(60));
        when(momentRepository.findById(momentId)).thenReturn(Optional.of(m));
        when(blockRepository.existsByBlockerIdAndBlockedId(any(), any())).thenReturn(false);
        when(followGraph.isFollowing(any(), any())).thenReturn(false);

        assertThatThrownBy(() -> service.recordView("sub", momentId, 1000, "s"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void takedownByNonAuthorRejected() {
        UUID uid = mockUser();
        UUID momentId = UUID.randomUUID();
        LocationMoment m = new LocationMoment();
        m.setAuthorId(UUID.randomUUID()); // someone else
        when(momentRepository.findById(momentId)).thenReturn(Optional.of(m));

        assertThatThrownBy(() -> service.takedown("sub", momentId))
                .isInstanceOf(BusinessException.class);
    }
}
