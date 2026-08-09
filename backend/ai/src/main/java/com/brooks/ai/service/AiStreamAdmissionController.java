package com.brooks.ai.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class AiStreamAdmissionController {

    private final int maxConcurrentStreamsPerUser;
    private final ConcurrentHashMap<UUID, AtomicInteger> activeStreams = new ConcurrentHashMap<>();

    public AiStreamAdmissionController(
            @Value("${app.async.ai.max-concurrent-streams-per-user:2}") int maxConcurrentStreamsPerUser) {
        if (maxConcurrentStreamsPerUser < 1) {
            throw new IllegalArgumentException("AI concurrent stream limit must be positive");
        }
        this.maxConcurrentStreamsPerUser = maxConcurrentStreamsPerUser;
    }

    public Permit acquire(UUID userId) {
        AtomicInteger counter = activeStreams.computeIfAbsent(userId, ignored -> new AtomicInteger());
        int active = counter.incrementAndGet();
        if (active > maxConcurrentStreamsPerUser) {
            release(userId, counter);
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many active AI requests. Wait for an existing response to finish.");
        }
        return new Permit(this, userId, counter);
    }

    int activeStreamCount(UUID userId) {
        AtomicInteger counter = activeStreams.get(userId);
        return counter == null ? 0 : counter.get();
    }

    private void release(UUID userId, AtomicInteger counter) {
        if (counter.decrementAndGet() == 0) {
            activeStreams.remove(userId, counter);
        }
    }

    public static final class Permit implements AutoCloseable {
        private final AiStreamAdmissionController owner;
        private final UUID userId;
        private final AtomicInteger counter;
        private final AtomicBoolean closed = new AtomicBoolean();

        private Permit(AiStreamAdmissionController owner, UUID userId, AtomicInteger counter) {
            this.owner = owner;
            this.userId = userId;
            this.counter = counter;
        }

        @Override
        public void close() {
            if (closed.compareAndSet(false, true)) {
                owner.release(userId, counter);
            }
        }
    }
}