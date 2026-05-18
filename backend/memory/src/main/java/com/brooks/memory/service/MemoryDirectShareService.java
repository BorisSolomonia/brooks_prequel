package com.brooks.memory.service;

import com.brooks.common.event.DirectMemoryShareCreatedEvent;
import com.brooks.common.exception.BusinessException;
import com.brooks.memory.domain.Memory;
import com.brooks.memory.domain.MemoryGrant;
import com.brooks.memory.domain.MemoryGrantSource;
import com.brooks.memory.repository.MemoryGrantRepository;
import com.brooks.memory.repository.MemoryRepository;
import com.brooks.social.repository.FollowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Direct in-app memory share — the creator picks a follower from their
 * list and shares a memory with them. Backed by MemoryGrant with
 * source = DIRECT (no share token).
 *
 * Authorization rule: the recipient MUST currently follow the creator.
 * This prevents misuse where someone publishes memories scoped to
 * arbitrary user IDs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemoryDirectShareService {

    private final MemoryRepository memoryRepository;
    private final MemoryGrantRepository memoryGrantRepository;
    private final FollowRepository followRepository;
    private final ApplicationEventPublisher events;

    @Transactional
    public MemoryGrant shareWithFollower(UUID memoryId, UUID creatorUserId, UUID recipientUserId) {
        // Memory must exist and belong to the creator who's sharing it.
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new BusinessException("Memory not found"));
        if (!memory.getCreatorId().equals(creatorUserId)) {
            throw new BusinessException("You can only share memories you created.");
        }

        // Recipient must currently follow the creator. No "share with anyone"
        // back-door. If recipient unfollows later, the grant remains valid
        // (the share contract is point-in-time), which matches user-facing
        // intent: "I shared this with you" doesn't auto-revoke on unfollow.
        boolean isFollower = followRepository.existsByFollowerIdAndFollowingId(
                recipientUserId, creatorUserId);
        if (!isFollower) {
            throw new BusinessException("That user does not follow you.");
        }

        // Idempotent: if the grant already exists (and isn't soft-removed),
        // just return it instead of creating a duplicate.
        Optional<MemoryGrant> existing = memoryGrantRepository
                .findByMemoryIdAndBeneficiaryUserId(memoryId, recipientUserId);
        if (existing.isPresent()
                && existing.get().getRemovedAt() == null
                && existing.get().getSource() == MemoryGrantSource.DIRECT) {
            return existing.get();
        }

        MemoryGrant grant = memoryGrantRepository.save(
                MemoryGrant.direct(memoryId, recipientUserId));

        // Fire event — notification module listens and pushes "shared a
        // memory with you" via FCM. Listener is @Async so this commits
        // fast even if FCM is slow.
        events.publishEvent(new DirectMemoryShareCreatedEvent(
                memoryId,
                creatorUserId,
                recipientUserId,
                trimPreview(memory.getTextContent())));

        return grant;
    }

    private String trimPreview(String s) {
        if (s == null) return "";
        String trimmed = s.trim();
        return trimmed.length() <= 60 ? trimmed : trimmed.substring(0, 57) + "...";
    }
}
