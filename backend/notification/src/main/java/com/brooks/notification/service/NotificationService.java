package com.brooks.notification.service;

import com.brooks.notification.domain.DeviceToken;
import com.brooks.notification.domain.InAppNotification;
import com.brooks.notification.repository.DeviceTokenRepository;
import com.brooks.notification.repository.InAppNotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final InAppNotificationRepository inAppRepo;
    private final FcmSender fcmSender;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Async
    @Transactional
    public void notifyUser(UUID userId, String title, String body, Map<String, String> data) {
        // 1. Persist in-app history FIRST so the bell dropdown shows the
        // notification even if every FCM send fails. The push is bonus;
        // the in-app record is the source of truth.
        String type = data != null ? data.getOrDefault("type", "generic") : "generic";
        String dataJson = null;
        if (data != null && !data.isEmpty()) {
            try {
                dataJson = objectMapper.writeValueAsString(data);
            } catch (Exception ignored) {
                /* fall through with null dataJson */
            }
        }
        inAppRepo.save(new InAppNotification(userId, type, safeTrim(title, 200), safeTrim(body, 500), dataJson));

        // 2. Fan-out the FCM push to every registered device.
        List<DeviceToken> tokens = deviceTokenRepository.findAllByUserId(userId);
        if (tokens.isEmpty()) {
            log.debug("No device tokens for user {} — in-app notification stored, push skipped", userId);
            return;
        }
        for (DeviceToken t : tokens) {
            boolean ok = fcmSender.send(t.getToken(), title, body, data);
            if (!ok) {
                deviceTokenRepository.deleteByToken(t.getToken());
            }
        }
    }

    private String safeTrim(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
