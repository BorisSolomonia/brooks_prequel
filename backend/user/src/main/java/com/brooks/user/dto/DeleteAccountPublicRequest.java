package com.brooks.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body for POST /api/account/delete-request (public, unauthenticated).
 * Email validity is checked but the endpoint NEVER reveals whether an account
 * exists — both branches return 200 with an empty body.
 */
public record DeleteAccountPublicRequest(
        @NotBlank @Email String email,
        @Size(max = 1000) String reason
) {}
