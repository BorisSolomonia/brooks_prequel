-- In-app notification history. Backs the bell-icon dropdown in the
-- Navbar and the future /notifications full-page route.
--
-- Every push fired via NotificationService.notifyUser also writes one
-- row here so the user can see the notification later even if they
-- missed the system push, dismissed it, or the FCM send failed.

CREATE TABLE in_app_notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(64) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    body        VARCHAR(500) NOT NULL,
    data_json   TEXT,
    read_at     TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Hot path: bell dropdown query "give me my last N notifications,
-- newest first". Partial index for unread covers the badge-count query.
CREATE INDEX idx_in_app_notifications_user_created
    ON in_app_notifications (user_id, created_at DESC);
CREATE INDEX idx_in_app_notifications_user_unread
    ON in_app_notifications (user_id) WHERE read_at IS NULL;
