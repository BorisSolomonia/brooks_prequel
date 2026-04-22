package com.brooks.auth.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    public String extractSubject(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return jwt.getSubject();
    }

    public Optional<String> extractEmail(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return Optional.ofNullable(jwt.getClaimAsString("email"));
    }

    public Optional<String> extractName(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return Optional.ofNullable(jwt.getClaimAsString("name"));
    }

    public Optional<String> extractPicture(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return Optional.ofNullable(jwt.getClaimAsString("picture"));
    }
}
