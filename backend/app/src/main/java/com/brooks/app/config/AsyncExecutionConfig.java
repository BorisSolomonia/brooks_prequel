package com.brooks.app.config;

import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.Map;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class AsyncExecutionConfig {

    @Bean(name = "aiTaskExecutor")
    public ThreadPoolTaskExecutor aiTaskExecutor(
            @Value("${app.async.ai.core-pool-size:2}") int corePoolSize,
            @Value("${app.async.ai.max-pool-size:8}") int maxPoolSize,
            @Value("${app.async.ai.queue-capacity:32}") int queueCapacity) {
        return buildExecutor(
                "ai-stream-",
                corePoolSize,
                maxPoolSize,
                queueCapacity,
                new ThreadPoolExecutor.AbortPolicy());
    }

    @Bean(name = "notificationTaskExecutor")
    public ThreadPoolTaskExecutor notificationTaskExecutor(
            @Value("${app.async.notification.core-pool-size:2}") int corePoolSize,
            @Value("${app.async.notification.max-pool-size:4}") int maxPoolSize,
            @Value("${app.async.notification.queue-capacity:256}") int queueCapacity) {
        return buildExecutor(
                "notification-",
                corePoolSize,
                maxPoolSize,
                queueCapacity,
                new ThreadPoolExecutor.CallerRunsPolicy());
    }

    private static ThreadPoolTaskExecutor buildExecutor(
            String threadPrefix,
            int corePoolSize,
            int maxPoolSize,
            int queueCapacity,
            java.util.concurrent.RejectedExecutionHandler rejectionHandler) {
        if (corePoolSize < 1 || maxPoolSize < corePoolSize || queueCapacity < 0) {
            throw new IllegalArgumentException("Invalid async executor sizing for " + threadPrefix);
        }

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix(threadPrefix);
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setAllowCoreThreadTimeOut(true);
        executor.setTaskDecorator(mdcTaskDecorator());
        executor.setRejectedExecutionHandler(rejectionHandler);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        return executor;
    }

    private static TaskDecorator mdcTaskDecorator() {
        return task -> {
            Map<String, String> callerContext = MDC.getCopyOfContextMap();
            return () -> {
                Map<String, String> previousContext = MDC.getCopyOfContextMap();
                try {
                    if (callerContext == null) {
                        MDC.clear();
                    } else {
                        MDC.setContextMap(callerContext);
                    }
                    task.run();
                } finally {
                    if (previousContext == null) {
                        MDC.clear();
                    } else {
                        MDC.setContextMap(previousContext);
                    }
                }
            };
        };
    }
}