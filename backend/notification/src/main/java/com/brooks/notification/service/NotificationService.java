package com.brooks.notification.service;

import com.brooks.notification.domain.DeviceToken;
import com.brooks.notification.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * High-level notification API. Domain code calls notifyUser(...) with a
 * recipient and payload; this service looks up all the recipient's FCM
 * tokens, sends to each, and purges any token FCM rejects as invalid.
 *
 * The notifyUser call is @Async so domain-side event listeners stay fast
 * — pushing notifications is fire-and-forget. If FCM is slow or down,
 * the domain transaction is unaffected.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final FcmSender fcmSender;

    @Async
    @Transactional
    public void notifyUser(UUID userId, String title, String body, Map<String, String> data) {
        List<DeviceToken> tokens = deviceTokenRepository.findAllByUserId(userId);
        if (tokens.isEmpty()) {
            log.debug("No device tokens for user {} — skipping notification \"{}\"", userId, title);
            return;
        }
        for (DeviceToken t : tokens) {
            boolean ok = fcmSender.send(t.getToken(), title, body, data);
            if (!ok) {
                // Conservatively purge tokens FCM didn't accept. Cheaper to
                // re-register on next app open than to keep stale rows.
                deviceTokenRepository.deleteByToken(t.getToken());
            }
        }
    }
}
