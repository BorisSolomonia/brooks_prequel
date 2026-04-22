package com.brooks.user.dto;

import com.brooks.user.domain.UserRole;
import com.brooks.user.domain.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String email;
    private String username;
    private UserRole role;
    private UserStatus status;
    private boolean onboardingCompleted;
    private Instant createdAt;
}
