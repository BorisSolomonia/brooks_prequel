package com.brooks.community.domain;

/**
 * Granular consent purposes (GDPR / Georgia 2024 law). Each is independently grantable and
 * refusable — refusing PUBLIC_CARD must never block LOCATION_ELIGIBILITY or unrelated features.
 */
public enum ConsentPurpose {
    LOCATION_ELIGIBILITY,
    PUBLIC_CARD
}
