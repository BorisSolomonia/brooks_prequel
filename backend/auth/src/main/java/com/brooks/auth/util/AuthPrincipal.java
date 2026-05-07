package com.brooks.auth.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Pulls the Auth0 subject out of a Spring Security {@link Authentication}. Centralises a cast
 * that was repeated in every controller and that quietly threw {@link ClassCastException} if
 * a non-JWT principal ever showed up.
 */
public final class AuthPrincipal {

    private AuthPrincipal() {}

    public static String subject(Authentication authentication) {
        if (authentication == null) {
            throw new IllegalStateException("No authenticated principal on request");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        throw new IllegalStateException(
                "Expected JWT principal but got " + (principal == null ? "null" : principal.getClass().getName()));
    }
}
