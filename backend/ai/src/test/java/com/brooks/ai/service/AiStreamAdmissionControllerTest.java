package com.brooks.ai.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiStreamAdmissionControllerTest {

    @Test
    void rejectsStreamsAboveThePerUserLimitAndReleasesCapacity() {
        AiStreamAdmissionController controller = new AiStreamAdmissionController(1);
        UUID userId = UUID.randomUUID();

        AiStreamAdmissionController.Permit first = controller.acquire(userId);

        assertThat(controller.activeStreamCount(userId)).isEqualTo(1);
        assertThatThrownBy(() -> controller.acquire(userId))
                .isInstanceOfSatisfying(ResponseStatusException.class, error ->
                        assertThat(error.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));

        first.close();
        assertThat(controller.activeStreamCount(userId)).isZero();

        try (AiStreamAdmissionController.Permit ignored = controller.acquire(userId)) {
            assertThat(controller.activeStreamCount(userId)).isEqualTo(1);
        }
        assertThat(controller.activeStreamCount(userId)).isZero();
    }

    @Test
    void permitCloseIsIdempotent() {
        AiStreamAdmissionController controller = new AiStreamAdmissionController(1);
        UUID userId = UUID.randomUUID();

        AiStreamAdmissionController.Permit permit = controller.acquire(userId);
        permit.close();
        permit.close();

        assertThat(controller.activeStreamCount(userId)).isZero();
    }

    @Test
    void rejectsInvalidConfiguration() {
        assertThatThrownBy(() -> new AiStreamAdmissionController(0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}