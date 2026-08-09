package com.brooks.ai.service;

import com.brooks.ai.dto.DecryptedKey;
import com.brooks.ai.dto.GuideHookRequest;
import com.brooks.ai.provider.AiClient;
import com.brooks.ai.provider.AiProvider;
import com.brooks.guide.repository.GuidePurchaseRepository;
import com.brooks.guide.service.GuideService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiChatServiceConcurrencyTest {

    @Test
    void holdsPerUserPermitUntilProviderStreamReturns() throws Exception {
        AiClient client = mock(AiClient.class);
        AiKeyService keyService = mock(AiKeyService.class);
        AiStreamAdmissionController admissionController = new AiStreamAdmissionController(1);
        ExecutorService executor = Executors.newSingleThreadExecutor();
        CountDownLatch enteredProvider = new CountDownLatch(1);
        CountDownLatch releaseProvider = new CountDownLatch(1);
        UUID userId = UUID.randomUUID();

        when(client.provider()).thenReturn(AiProvider.OPENAI);
        when(keyService.decryptKey(userId, AiProvider.OPENAI))
                .thenReturn(new DecryptedKey("test-key", "test-model"));
        doAnswer(invocation -> {
            enteredProvider.countDown();
            if (!releaseProvider.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Test provider was not released");
            }
            return null;
        }).when(client).streamChat(
                anyString(), anyString(), anyString(), any(), anyString(), any(), any());

        AiChatService service = new AiChatService(
                List.of(client),
                keyService,
                mock(GuideService.class),
                mock(GuidePurchaseRepository.class),
                new AiStreamExecutor(executor::execute),
                admissionController);

        try {
            service.guideHook(userId, new GuideHookRequest(
                    AiProvider.OPENAI, "A guide", null, null, "Tbilisi", "Georgia"));

            assertThat(enteredProvider.await(2, TimeUnit.SECONDS)).isTrue();
            assertThat(admissionController.activeStreamCount(userId)).isEqualTo(1);
            assertThatThrownBy(() -> admissionController.acquire(userId))
                    .isInstanceOfSatisfying(ResponseStatusException.class, error ->
                            assertThat(error.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));

            releaseProvider.countDown();
            waitUntilNoActiveStream(admissionController, userId, Duration.ofSeconds(2));
        } finally {
            releaseProvider.countDown();
            executor.shutdownNow();
        }
    }

    private static void waitUntilNoActiveStream(
            AiStreamAdmissionController controller,
            UUID userId,
            Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (controller.activeStreamCount(userId) != 0 && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        assertThat(controller.activeStreamCount(userId)).isZero();
    }
}