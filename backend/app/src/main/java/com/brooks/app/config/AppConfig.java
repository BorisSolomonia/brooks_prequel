package com.brooks.app.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.filter.CommonsRequestLoggingFilter;
import lombok.extern.slf4j.Slf4j;

@Configuration
@EnableScheduling
@Slf4j
public class AppConfig {

    @Bean
    public CommonsRequestLoggingFilter requestLoggingFilter() {
        CommonsRequestLoggingFilter filter = new CommonsRequestLoggingFilter();
        filter.setIncludeClientInfo(true);
        filter.setIncludeQueryString(true);
        filter.setIncludeHeaders(false);
        filter.setIncludePayload(false);
        filter.setBeforeMessagePrefix("HTTP request started: ");
        filter.setAfterMessagePrefix("HTTP request completed: ");
        return filter;
    }

    @Bean
    public ApplicationRunner startupDiagnostics(
            @Value("${spring.datasource.url}") String datasourceUrl,
            @Value("${auth0.domain}") String auth0Domain,
            @Value("${auth0.audience}") String auth0Audience,
            @Value("${app.cors.allowed-origins}") String allowedOrigins,
            @Value("${app.seed.example.enabled}") boolean exampleSeedEnabled) {
        return new ApplicationRunner() {
            @Override
            public void run(ApplicationArguments args) {
                log.info("Startup diagnostics: datasource='{}', auth0Domain='{}', auth0Audience='{}', allowedOrigins='{}', exampleSeedEnabled={}",
                        datasourceUrl, auth0Domain, auth0Audience, allowedOrigins, exampleSeedEnabled);
            }
        };
    }
}
