package com.brooks.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Tags each HTTP request with a {@code requestId} in SLF4J MDC and as an
 * {@code X-Request-Id} response header so logs from one request can be
 * correlated across services.
 *
 * Honors an inbound {@code X-Request-Id} header (so an upstream load balancer
 * can stamp the id) and falls back to a freshly generated UUID otherwise.
 *
 * Ordered very early so every other filter and the application code see the
 * MDC field populated.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestIdFilter extends OncePerRequestFilter {

    public static final String MDC_KEY = "requestId";
    public static final String HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String inbound = request.getHeader(HEADER);
        String id = (inbound != null && !inbound.isBlank() && inbound.length() <= 128)
                ? inbound
                : UUID.randomUUID().toString();
        MDC.put(MDC_KEY, id);
        response.setHeader(HEADER, id);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
