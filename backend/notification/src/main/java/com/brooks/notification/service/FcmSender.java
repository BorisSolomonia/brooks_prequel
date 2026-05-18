package com.brooks.notification.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Thin wrapper around FirebaseMessaging. Handles the actual FCM send call
 * and surfaces invalid-token errors so the caller can purge dead tokens
 * from the DB.
 *
 * Injected as nullable — when no Firebase credentials are present
 * (FirebaseConfig returns null), all sends are logged-and-skipped. This
 * keeps dev environments fully bootable without Firebase setup.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FcmSender {

    @Autowired(required = false)
    private FirebaseMessaging firebaseMessaging;

    /**
     * @return true if FCM accepted the message, false if the token was
     *         rejected as invalid (caller should delete it) or if FCM is
     *         not configured.
     */
    public boolean send(String token, String title, String body, Map<String, String> data) {
        if (firebaseMessaging == null) {
            log.debug("FCM not configured — skipping send to {}", maskToken(token));
            return false;
        }
        try {
            Message.Builder builder = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build());
            if (data != null && !data.isEmpty()) {
                builder.putAllData(data);
            }
            String messageId = firebaseMessaging.send(builder.build());
            log.info("FCM sent (id={}) to {}", messageId, maskToken(token));
            return true;
        } catch (FirebaseMessagingException e) {
            String code = e.getMessagingErrorCode() != null ? e.getMessagingErrorCode().name() : "unknown";
            if ("UNREGISTERED".equals(code) || "INVALID_ARGUMENT".equals(code)) {
                log.info("FCM token {} no longer valid ({}), caller should purge", maskToken(token), code);
                return false;
            }
            log.warn("FCM send failed ({}) for {}: {}", code, maskToken(token), e.getMessage());
            return false;
        } catch (Exception e) {
            log.warn("FCM send unexpected error for {}: {}", maskToken(token), e.getMessage());
            return false;
        }
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 12) return "***";
        return token.substring(0, 8) + "..." + token.substring(token.length() - 4);
    }
}
