package com.brooks.notification.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * In-app history of every push fired to this user. Backs the bell-icon
 * dropdown so users can see notifications they missed in the system tray.
 *
 * Intentionally simple: one row per push event. read_at is set when the
 * user opens the dropdown (or visits the notifications page).
 */
@Entity
@Table(name = "in_app_notifications")
@Getter
@Setter
@NoArgsConstructor
public class InAppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "type", nullable = false, length = 64)
    private String type;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", nullable = false, length = 500)
    private String body;

    @Column(name = "data_json", columnDefinition = "text")
    private String dataJson;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public InAppNotification(UUID userId, String type, String title, String body, String dataJson) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.body = body;
        this.dataJson = dataJson;
        this.createdAt = Instant.now();
    }
}
