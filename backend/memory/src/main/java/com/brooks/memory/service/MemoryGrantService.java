package com.brooks.memory.service;

import com.brooks.common.exception.ResourceNotFoundException;
import com.brooks.memory.domain.MemoryGrant;
import com.brooks.memory.repository.MemoryGrantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemoryGrantService {

    private final MemoryGrantRepository memoryGrantRepository;

    @Transactional
    public void grantOnReveal(UUID memoryId, UUID beneficiaryUserId, UUID shareId) {
        memoryGrantRepository.findByMemoryIdAndBeneficiaryUserId(memoryId, beneficiaryUserId)
                .ifPresentOrElse(existing -> {
                    if (existing.getRemovedAt() != null) {
                        existing.setRemovedAt(null);
                    }
                    // A reveal always unlocks: if this grant was a locked DIRECT
                    // share (revealed_at NULL), passing the distance check now
                    // reveals it.
                    if (existing.getRevealedAt() == null) {
                        existing.setRevealedAt(Instant.now());
                    }
                }, () -> {
                    try {
                        memoryGrantRepository.save(new MemoryGrant(memoryId, beneficiaryUserId, shareId));
                    } catch (DataIntegrityViolationException ignored) {
                        // concurrent reveal raced and won — existing row is correct
                    }
                });
    }

    @Transactional
    public void removeForBeneficiary(UUID memoryId, UUID beneficiaryUserId) {
        MemoryGrant grant = memoryGrantRepository.findByMemoryIdAndBeneficiaryUserId(memoryId, beneficiaryUserId)
                .filter(g -> g.getRemovedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Memory grant", memoryId));
        grant.setRemovedAt(Instant.now());
    }
}
