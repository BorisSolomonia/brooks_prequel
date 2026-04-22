package com.brooks.ai.controller;

import com.brooks.auth.service.AuthService;
import com.brooks.user.service.UserService;
import org.springframework.security.core.Authentication;

import java.util.UUID;

class ControllerUtils {

    private ControllerUtils() {}

    static UUID resolveUserId(Authentication auth, AuthService authService, UserService userService) {
        return userService.findByAuth0Subject(authService.extractSubject(auth)).getId();
    }
}
