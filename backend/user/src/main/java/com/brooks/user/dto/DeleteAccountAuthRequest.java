package com.brooks.user.dto;

import jakarta.validation.constraints.Size;

/**
 * Body for POST /api/account/delete (authenticated).
 * Reason is optional product-feedback; capped at 1000 chars to bound storage.
 */
public record DeleteAccountAuthRequest(
        @Size(max = 1000) String reason
) {}
