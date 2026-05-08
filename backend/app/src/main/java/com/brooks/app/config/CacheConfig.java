package com.brooks.app.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;

/**
 * Per-cache Caffeine specs. Each cache has its own size + TTL because the access patterns
 * are different (a guide preview is hit far more often than an admin ranking).
 *
 * Add a new cache here, then annotate the producing method with {@code @Cacheable("name")}.
 */
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(
                build("guidePreviews", 20_000, Duration.ofMinutes(5)),
                build("usersBySubject", 10_000, Duration.ofMinutes(10)),
                build("rankings", 200, Duration.ofMinutes(5))
        ));
        return manager;
    }

    private static CaffeineCache build(String name, long maxSize, Duration ttl) {
        return new CaffeineCache(name, Caffeine.newBuilder()
                .maximumSize(maxSize)
                .expireAfterWrite(ttl)
                .recordStats()
                .build());
    }
}
