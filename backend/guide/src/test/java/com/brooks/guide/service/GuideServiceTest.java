package com.brooks.guide.service;

import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.guide.domain.Guide;
import com.brooks.guide.dto.GuideBlockRequest;
import com.brooks.guide.dto.GuideDayRequest;
import com.brooks.guide.dto.GuidePlaceRequest;
import com.brooks.guide.repository.GuideBlockRepository;
import com.brooks.guide.repository.GuideDayRepository;
import com.brooks.guide.repository.GuidePlaceRepository;
import com.brooks.guide.repository.GuideRepository;
import com.brooks.guide.repository.GuideTagRepository;
import com.brooks.guide.repository.GuideVersionRepository;
import com.brooks.guide.repository.SavedGuideRepository;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuideServiceTest {

    @Mock private GuideRepository guideRepository;
    @Mock private GuideDayRepository dayRepository;
    @Mock private GuideBlockRepository blockRepository;
    @Mock private GuidePlaceRepository placeRepository;
    @Mock private GuideTagRepository tagRepository;
    @Mock private GuideVersionRepository versionRepository;
    @Mock private SavedGuideRepository savedGuideRepository;
    @Mock private UserProfileRepository profileRepository;
    @Mock private UserService userService;
    @Mock private ApplicationEventPublisher eventPublisher;

    private GuideService guideService;
    private User owner;
    private UUID guideId;

    @BeforeEach
    void setUp() {
        guideService = new GuideService(
                guideRepository,
                dayRepository,
                blockRepository,
                placeRepository,
                tagRepository,
                versionRepository,
                savedGuideRepository,
                profileRepository,
                userService,
                new ObjectMapper(),
                eventPublisher
        );

        owner = new User();
        owner.setId(UUID.randomUUID());
        guideId = UUID.randomUUID();

        Guide guide = new Guide(owner.getId(), "Guide");
        guide.setId(guideId);

        when(userService.findByAuth0Subject("subject")).thenReturn(owner);
        when(guideRepository.findById(guideId)).thenReturn(Optional.of(guide));
    }

    @Test
    void updateDayRejectsDayOutsideOwnedGuide() {
        UUID dayId = UUID.randomUUID();
        when(dayRepository.findByIdAndGuideId(dayId, guideId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> guideService.updateDay("subject", guideId, dayId, new GuideDayRequest()));
    }

    @Test
    void updateBlockRejectsBlockOutsideOwnedGuide() {
        UUID blockId = UUID.randomUUID();
        when(blockRepository.findByIdAndDayGuideId(blockId, guideId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> guideService.updateBlock("subject", guideId, blockId, new GuideBlockRequest()));
    }

    @Test
    void updatePlaceRejectsPlaceOutsideOwnedGuide() {
        UUID placeId = UUID.randomUUID();
        when(placeRepository.findByIdAndBlockDayGuideId(placeId, guideId)).thenReturn(Optional.empty());

        GuidePlaceRequest request = new GuidePlaceRequest();
        request.setName("Place");

        assertThrows(ResourceNotFoundException.class,
                () -> guideService.updatePlace("subject", guideId, placeId, request));
    }
}
