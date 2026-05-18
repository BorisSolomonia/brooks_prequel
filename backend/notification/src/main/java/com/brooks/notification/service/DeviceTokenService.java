package com.brooks.notification.service;

import com.brooks.notification.domain.DevicePlatform;
import com.brooks.notification.domain.DeviceToken;
import com.brooks.notification.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceTokenService {

    private final DeviceTokenRepository deviceTokenRepository;

    /**
     * Idempotent registration. If the token already exists, update its
     * userId (token may have moved between users on the same device) and
     * touch lastSeenAt. Otherwise insert.
     */
    @Transactional
    public DeviceToken upsert(UUID userId, String token, DevicePlatform platform) {
        return deviceTokenRepository.findByToken(token)
                .map(existing -> {
                    existing.setUserId(userId);
                    existing.setPlatform(platform);
                    existing.setLastSeenAt(Instant.now());
                    return existing;
                })
                .orElseGet(() -> deviceTokenRepository.save(new DeviceToken(userId, token, platform)));
    }

    @Transactional
    public void deleteToken(String token) {
        deviceTokenRepository.deleteByToken(token);
    }
}
