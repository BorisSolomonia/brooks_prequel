package com.brooks.memory.service;

import com.brooks.memory.domain.Memory;
import com.brooks.memory.domain.MemoryReveal;
import com.brooks.memory.domain.MemoryShare;
import com.brooks.memory.dto.MemoryRevealRequest;
import com.brooks.memory.dto.MemoryRevealResponse;
import com.brooks.memory.repository.MemoryCreatorVisibilityPreferenceRepository;
import com.brooks.memory.repository.MemoryRepository;
import com.brooks.memory.repository.MemoryRevealRepository;
import com.brooks.memory.repository.MemoryShareRepository;
import com.brooks.profile.repository.UserProfileRepository;
import com.brooks.user.domain.User;
import com.brooks.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemoryServiceTest {

    @Mock private MemoryRepository memoryRepository;
    @Mock private MemoryShareRepository shareRepository;
    @Mock private MemoryRevealRepository revealRepository;
    @Mock private MemoryCreatorVisibilityPreferenceRepository visibilityPreferenceRepository;
    @Mock private ProductEventService productEventService;
    @Mock private MemorySchemaHealthService memorySchemaHealthService;
    @Mock private UserService userService;
    @Mock private UserProfileRepository profileRepository;

    private MemoryService memoryService;
    private User viewer;
    private User creator;
    private Memory memory;
    private MemoryShare share;

    @BeforeEach
    void setUp() {
        memoryService = new MemoryService(
                memoryRepository,
                shareRepository,
                revealRepository,
                visibilityPreferenceRepository,
                productEventService,
                memorySchemaHealthService,
                userService,
                profileRepository
        );
        ReflectionTestUtils.setField(memoryService, "unlockRadiusMeters", 100.0);

        viewer = new User("viewer-subject", "viewer@example.com");
        viewer.setId(UUID.randomUUID());

        creator = new User("creator-subject", "creator@example.com");
        creator.setId(UUID.randomUUID());
        creator.setUsername("creator");

        memory = new Memory(creator.getId(), "Meet me here", 41.705449, 44.771109);
        memory.setId(UUID.randomUUID());

        share = new MemoryShare(memory, "share-token");
        share.setId(UUID.randomUUID());
    }

    @Test
    void revealShareRevealsMemoryInsideOneHundredMeters() {
        when(userService.findByAuth0Subject("viewer-subject")).thenReturn(viewer);
        when(userService.findById(creator.getId())).thenReturn(creator);
        when(profileRepository.findByUserId(creator.getId())).thenReturn(Optional.empty());
        when(shareRepository.findByTokenAndRevokedAtIsNull("share-token")).thenReturn(Optional.of(share));
        when(revealRepository.save(any(MemoryReveal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MemoryRevealRequest request = revealRequest(41.705449, 44.771109);

        MemoryRevealResponse response = memoryService.revealShare("viewer-subject", "share-token", request);

        assertTrue(response.isRevealed());
        assertEquals(100.0, response.getUnlockRadiusMeters());
        assertEquals(0.0, response.getDistanceMeters(), 0.1);
        assertNotNull(response.getMemory());
        assertEquals("Meet me here", response.getMemory().getTextContent());

        ArgumentCaptor<MemoryReveal> revealCaptor = ArgumentCaptor.forClass(MemoryReveal.class);
        verify(revealRepository).save(revealCaptor.capture());
        assertTrue(revealCaptor.getValue().isSucceeded());
        verify(productEventService).record("MEMORY_REVEALED", viewer.getId(), memory.getId(), "share-token", null);
    }

    @Test
    void revealShareDoesNotRevealMemoryOutsideOneHundredMeters() {
        when(userService.findByAuth0Subject("viewer-subject")).thenReturn(viewer);
        when(shareRepository.findByTokenAndRevokedAtIsNull("share-token")).thenReturn(Optional.of(share));
        when(revealRepository.save(any(MemoryReveal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MemoryRevealRequest request = revealRequest(41.705449, 44.773109);

        MemoryRevealResponse response = memoryService.revealShare("viewer-subject", "share-token", request);

        assertFalse(response.isRevealed());
        assertEquals(100.0, response.getUnlockRadiusMeters());
        assertTrue(response.getDistanceMeters() > 100.0);
        assertNull(response.getMemory());

        ArgumentCaptor<MemoryReveal> revealCaptor = ArgumentCaptor.forClass(MemoryReveal.class);
        verify(revealRepository).save(revealCaptor.capture());
        assertFalse(revealCaptor.getValue().isSucceeded());
        verify(productEventService).record("REVEAL_ATTEMPTED", viewer.getId(), memory.getId(), "share-token", null);
    }

    private static MemoryRevealRequest revealRequest(double latitude, double longitude) {
        MemoryRevealRequest request = new MemoryRevealRequest();
        request.setLatitude(latitude);
        request.setLongitude(longitude);
        return request;
    }
}
